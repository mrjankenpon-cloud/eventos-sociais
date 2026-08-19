import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import {
  PIX_MINUTES,
  RESERVE_MINUTES,
  checkoutProPaymentMethods,
  clientSafeMessage,
  createPixCharge,
  db,
  getAppUrl,
  isoWithOffset,
  clientIpFromRequest,
  mpAdditionalInfoPayer,
  mpCheckoutPayer,
  mpFetch,
  mpDeviceHeaders,
  parseDeviceSessionId,
  mpWebhookUrl,
  parseCheckoutMetodo,
  randomToken,
  roundMoney,
  assertMercadoPagoCredentials,
} from './helpers';
import { emitTicketsForPedido, releaseStockLines, reserveStockLines } from './stock';
import { sendOrderConfirmationEmail } from '../email/guestAccess';
import { allowAttempt, requestIp } from '../http/rateLimit';
import {
  eventDateForMp,
  mpCheckoutProItems,
  mpPreferenceIndustryItems,
} from './industry';

type CheckoutItemInput = {
  ingressoId?: string;
  quantidade?: number;
};

type CheckoutBody = {
  eventoId?: string;
  /** Legado: um único tipo */
  ingressoId?: string;
  quantidade?: number;
  /** Carrinho: vários tipos no mesmo pagamento */
  itens?: CheckoutItemInput[];
  /** pix = QR no site; checkout_pro = cartão no Mercado Pago */
  metodo?: string;
  deviceId?: string;
  comprador?: {
    nome?: string;
    cpf?: string;
    telefone?: string;
    email?: string;
  };
};

type ReservedLine = { ingressoId: string; quantidade: number };

type ResolvedLine = {
  ingressoId: string;
  nome: string;
  key: string;
  natureza: string;
  quantidade: number;
  valorUnitario: number;
};

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function vendasAbertas(evento: Record<string, unknown>): boolean {
  if (evento.arquivado === true || evento.status === 'arquivado') return false;
  const publicado =
    evento.publicado === true || evento.status === 'publicado';
  if (!publicado) return false;
  if (evento.permitirCompraOnline === false) return false;
  const encerramRaw = evento.vendasEncerramEm;
  if (encerramRaw) {
    const encerram = new Date(String(encerramRaw)).getTime();
    if (!Number.isNaN(encerram) && Date.now() >= encerram) return false;
  }
  return true;
}

async function countCpfTicketsForEvent(
  eventoId: string,
  cpf: string
): Promise<number> {
  const snap = await db()
    .collection('pedidos')
    .where('eventoId', '==', eventoId)
    .where('cpf', '==', cpf)
    .get();

  let total = 0;
  for (const doc of snap.docs) {
    const row = doc.data() || {};
    const tipo = String(row.tipo || '');
    if (tipo === 'doacao' || tipo === 'upgrade') continue;
    const status = String(row.status || '');
    if (status !== 'pendente' && status !== 'confirmado') continue;
    total += Math.max(0, Math.floor(Number(row.quantidade) || 0));
  }
  return total;
}

function parseRequestedItems(body: CheckoutBody): ReservedLine[] {
  const fromArray = Array.isArray(body.itens) ? body.itens : [];
  const merged = new Map<string, number>();

  for (const raw of fromArray) {
    const ingressoId = String(raw?.ingressoId || '').trim();
    const quantidade = Math.floor(Number(raw?.quantidade) || 0);
    if (!ingressoId || quantidade < 1) continue;
    merged.set(ingressoId, (merged.get(ingressoId) || 0) + quantidade);
  }

  if (merged.size === 0) {
    const ingressoId = String(body.ingressoId || '').trim();
    const quantidade = Math.floor(Number(body.quantidade) || 0);
    if (ingressoId && quantidade >= 1) {
      merged.set(ingressoId, quantidade);
    }
  }

  return [...merged.entries()].map(([ingressoId, quantidade]) => ({
    ingressoId,
    quantidade,
  }));
}

async function releaseReserved(lines: ReservedLine[]): Promise<void> {
  if (lines.length === 0) return;
  try {
    await releaseStockLines(lines);
  } catch (err) {
    functions.logger.error('[createCheckoutSession] rollback estoque', {
      lines,
      err,
    });
  }
}

export const createCheckoutSession = functions.https.onRequest(
  async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    if (!allowAttempt(`checkout:${requestIp(req)}`, 8, 10 * 60 * 1000)) {
      res.status(429).json({
        error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
      });
      return;
    }

    const reserved: ReservedLine[] = [];

    try {
      assertMercadoPagoCredentials();
      const body = (req.body || {}) as CheckoutBody;
      const eventoId = String(body.eventoId || '').trim();
      const requested = parseRequestedItems(body);
      const comprador = body.comprador || {};

      const nome = String(comprador.nome || '').trim();
      const cpf = String(comprador.cpf || '').replace(/\D/g, '');
      const telefone = String(comprador.telefone || '').trim();
      const email = String(comprador.email || '').trim().toLowerCase();
      const deviceSessionId = parseDeviceSessionId(body.deviceId);

      if (!eventoId) {
        res.status(400).json({ error: 'eventoId obrigatório' });
        return;
      }
      if (requested.length < 1) {
        res.status(400).json({
          error: 'Selecione a quantidade de pelo menos um tipo de ingresso',
        });
        return;
      }
      if (nome.length < 4 || cpf.length < 11 || !email.includes('@')) {
        res.status(400).json({ error: 'Dados do comprador inválidos' });
        return;
      }

      const eventoSnap = await db().collection('eventos').doc(eventoId).get();
      if (!eventoSnap.exists) {
        res.status(404).json({ error: 'Evento não encontrado' });
        return;
      }
      const evento = (eventoSnap.data() || {}) as Record<string, unknown>;
      if (!vendasAbertas(evento)) {
        res.status(400).json({ error: 'Vendas encerradas para este evento' });
        return;
      }

      const eventLimit =
        Number(evento.limitePorCompra) > 0 ? Number(evento.limitePorCompra) : 10;
      const totalQtyRequested = requested.reduce((s, l) => s + l.quantidade, 0);
      if (totalQtyRequested > eventLimit) {
        res.status(400).json({
          error: `Limite de ${eventLimit} ingresso(s) por compra`,
        });
        return;
      }

      const cpfLimit = Math.max(0, Number(evento.limitePorCpf) || 0);
      if (cpfLimit > 0) {
        const already = await countCpfTicketsForEvent(eventoId, cpf);
        if (already + totalQtyRequested > cpfLimit) {
          const remaining = Math.max(0, cpfLimit - already);
          res.status(400).json({
            error:
              remaining <= 0
                ? `Este CPF já atingiu o limite de ${cpfLimit} ingresso(s) neste evento`
                : `Este CPF pode adquirir mais ${remaining} ingresso(s) neste evento (limite ${cpfLimit} por CPF)`,
          });
          return;
        }
      }

      const resolved: ResolvedLine[] = [];
      for (const line of requested) {
        const ingressoSnap = await db()
          .collection('ingressos')
          .doc(line.ingressoId)
          .get();
        if (!ingressoSnap.exists) {
          res.status(404).json({
            error: `Tipo de ingresso não encontrado (${line.ingressoId})`,
          });
          return;
        }
        const ingresso = (ingressoSnap.data() || {}) as Record<string, unknown>;
        if (String(ingresso.eventoId) !== eventoId) {
          res
            .status(400)
            .json({ error: 'Ingresso não pertence a este evento' });
          return;
        }
        if (ingresso.ativo === false) {
          res.status(400).json({ error: 'Tipo de ingresso inativo' });
          return;
        }

        const typeLimit =
          Number(ingresso.limitePorCompra) > 0
            ? Number(ingresso.limitePorCompra)
            : eventLimit;
        if (line.quantidade > typeLimit) {
          res.status(400).json({
            error: `Limite de ${typeLimit} para ${String(ingresso.nome || 'ingresso')}`,
          });
          return;
        }

        resolved.push({
          ingressoId: line.ingressoId,
          nome: String(ingresso.nome || 'Ingresso'),
          key: String(ingresso.key || ''),
          natureza: String(ingresso.natureza || 'entrada'),
          quantidade: line.quantidade,
          valorUnitario: roundMoney(Number(ingresso.valor) || 0),
        });
      }

      const quantidade = resolved.reduce((s, l) => s + l.quantidade, 0);
      const valorTotal = roundMoney(
        resolved.reduce((s, l) => s + l.valorUnitario * l.quantidade, 0)
      );
      const primary = resolved[0];
      const valorUnitario =
        quantidade > 0 ? roundMoney(valorTotal / quantidade) : 0;
      const ingressoNomeResumo = resolved
        .map((l) =>
          l.quantidade > 1 ? `${l.nome} ×${l.quantidade}` : l.nome
        )
        .join(' · ');

      const accessToken = randomToken(32);
      const agora = new Date();
      const metodo =
        valorTotal === 0 ? 'checkout_pro' : parseCheckoutMetodo(body.metodo);
      const holdMinutes = metodo === 'pix' ? PIX_MINUTES : RESERVE_MINUTES;
      const reservaExpiraEm = new Date(
        agora.getTime() + holdMinutes * 60 * 1000
      );

      await reserveStockLines(
        resolved.map((l) => ({
          ingressoId: l.ingressoId,
          quantidade: l.quantidade,
        }))
      );
      reserved.push(
        ...resolved.map((l) => ({
          ingressoId: l.ingressoId,
          quantidade: l.quantidade,
        }))
      );

      const pedidoRef = db().collection('pedidos').doc();
      const basePedido: Record<string, unknown> = {
        nomeComprador: nome,
        cpf,
        telefone,
        email,
        eventoId,
        ingressoId: primary.ingressoId,
        ingressoKey: primary.key,
        ingressoNome: ingressoNomeResumo,
        natureza: primary.natureza,
        itens: resolved.map((l) => ({
          ingressoId: l.ingressoId,
          nome: l.nome,
          key: l.key,
          natureza: l.natureza,
          quantidade: l.quantidade,
          valorUnitario: l.valorUnitario,
        })),
        quantidade,
        valorUnitario,
        valorTotal,
        status: valorTotal === 0 ? 'confirmado' : 'pendente',
        qrCode: '',
        dataCompra: agora.toISOString(),
        formaPagamento:
          valorTotal === 0
            ? 'gratuito'
            : metodo === 'pix'
              ? 'pix'
              : 'mercadopago',
        estoqueReservado: true,
        reservaExpiraEm: reservaExpiraEm.toISOString(),
        ticketsEmitidos: false,
        accessToken,
        guestCheckout: true,
        ativo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (valorTotal === 0) {
        await pedidoRef.set(basePedido);
        reserved.length = 0;
        const emit = await emitTicketsForPedido(pedidoRef.id, {
          ...basePedido,
          ticketsEmitidos: false,
        });
        functions.logger.info('[createCheckoutSession] gratuito', {
          pedidoId: pedidoRef.id,
          tickets: emit.count,
          tipos: resolved.length,
        });

        await sendOrderConfirmationEmail({
          id: pedidoRef.id,
          email,
          nomeComprador: nome,
          eventoId,
        });

        res.json({
          ok: true,
          gratuito: true,
          pedidoId: pedidoRef.id,
          accessToken,
          receiptUrl: `${getAppUrl()}/pedido/${pedidoRef.id}/sucesso?token=${accessToken}`,
        });
        return;
      }

      const appUrl = getAppUrl();
      const notificationUrl = mpWebhookUrl();
      const successUrl = `${appUrl}/pedido/${pedidoRef.id}/sucesso`;
      const clientIp = clientIpFromRequest(req);
      const eventDate = eventDateForMp(evento);
      const industryItems = resolved.map((l) => ({
        id: l.ingressoId,
        title: `${String(evento.titulo || 'Evento')} | ${l.nome}`.slice(0, 256),
        description: `${String(evento.local || evento.cidade || 'Evento')} — ${l.nome}`.slice(
          0,
          256
        ),
        category_id: 'tickets',
        quantity: l.quantidade,
        unit_price: l.valorUnitario,
        event_date: eventDate,
      }));

      if (metodo === 'pix') {
        await pedidoRef.set(basePedido);
        try {
          const pix = await createPixCharge({
            pedidoId: pedidoRef.id,
            valor: valorTotal,
            description: `${String(evento.titulo || 'Evento')} — ${ingressoNomeResumo}`,
            email,
            nome,
            documento: cpf,
            documentoTipo: 'cpf',
            telefone,
            expiresAt: isoWithOffset(reservaExpiraEm),
            idempotencyKey: `ticket-pix-${pedidoRef.id}`,
            deviceSessionId,
            items: industryItems,
          });
          await pedidoRef.update({
            qrCode: pix.qrCode,
            pixQrCode: pix.qrCode,
            pixQrCodeBase64: pix.qrCodeBase64,
            pixTicketUrl: pix.ticketUrl || null,
            pixExpiresAt: pix.expiresAt || reservaExpiraEm.toISOString(),
            mpPaymentId: pix.paymentId,
            mpOrderId: pix.orderId || null,
            mpOrderPaymentId: pix.orderPaymentId || null,
            mpStatus: pix.status || 'pending',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          reserved.length = 0;
          res.json({
            ok: true,
            pix: true,
            gratuito: false,
            pedidoId: pedidoRef.id,
            accessToken,
            qrCode: pix.qrCode,
            qrCodeBase64: pix.qrCodeBase64,
            ticketUrl: pix.ticketUrl || undefined,
            expiresAt: pix.expiresAt || reservaExpiraEm.toISOString(),
            receiptUrl: `${successUrl}?token=${accessToken}`,
          });
          return;
        } catch (pixError) {
          await releaseReserved(reserved);
          reserved.length = 0;
          await pedidoRef.update({
            status: 'cancelado',
            estoqueReservado: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          throw pixError;
        }
      }

      let preference: {
        id: string;
        init_point?: string;
        sandbox_init_point?: string;
      };
      try {
        // Checkout Pro: crédito/débito (PIX é gerado no site).
        // Preferência só com campos do checkout hospedado — event_date / industry
        // extra no item da preferência deixa o botão Pagar cinza.
        const preferenceBody: Record<string, unknown> = {
          items: mpCheckoutProItems(industryItems),
          payer: mpCheckoutPayer({
            email,
            nome,
            documento: cpf,
            telefone,
          }),
          additional_info: {
            ...(clientIp ? { ip_address: clientIp } : {}),
            items: mpPreferenceIndustryItems(industryItems),
            payer: mpAdditionalInfoPayer({ nome, telefone }),
          },
          external_reference: pedidoRef.id,
          metadata: {
            pedidoId: pedidoRef.id,
            eventoId,
            ingressoId: primary.ingressoId,
            natureza: primary.natureza,
            tipos: resolved.length,
          },
          back_urls: {
            success: successUrl,
            pending: successUrl,
            failure: successUrl,
          },
          auto_return: 'approved',
          binary_mode: false,
          notification_url: notificationUrl,
          statement_descriptor: 'DELPHOS',
          payment_methods: checkoutProPaymentMethods(),
        };

        preference = await mpFetch('/checkout/preferences', {
          method: 'POST',
          headers: mpDeviceHeaders(deviceSessionId),
          body: JSON.stringify(preferenceBody),
        });
      } catch (mpError) {
        await releaseReserved(reserved);
        reserved.length = 0;
        throw mpError;
      }

      // Preferir init_point mesmo em modo teste (credenciais TESTUSER).
      // sandbox_init_point redireciona ao domínio sandbox legado e falha com frequência.
      const initPoint =
        preference.init_point || preference.sandbox_init_point || '';

      await pedidoRef.set({
        ...basePedido,
        mpPreferenceId: preference.id,
        linkPagamento: initPoint,
      });
      reserved.length = 0;

      res.json({
        ok: true,
        gratuito: false,
        pedidoId: pedidoRef.id,
        accessToken,
        preferenceId: preference.id,
        initPoint,
        receiptUrl: `${appUrl}/pedido/${pedidoRef.id}/sucesso?token=${accessToken}`,
      });
    } catch (error) {
      if (reserved.length > 0) {
        await releaseReserved(reserved);
      }
      functions.logger.error('[createCheckoutSession]', error);
      res.status(500).json({
        error: clientSafeMessage(error, 'Falha ao criar checkout'),
      });
    }
  }
);
