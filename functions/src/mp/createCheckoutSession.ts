import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import {
  RESERVE_MINUTES,
  db,
  getAppUrl,
  getSandboxPayerEmail,
  isMercadoPagoSandbox,
  mpFetch,
  randomToken,
  roundMoney,
} from './helpers';
import { emitTicketsForPedido, releaseStock, reserveStock } from './stock';
import { sendOrderConfirmationEmail } from '../email/guestAccess';

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
  for (const line of lines) {
    try {
      await releaseStock(line.ingressoId, line.quantidade);
    } catch (err) {
      functions.logger.error('[createCheckoutSession] rollback estoque', {
        ...line,
        err,
      });
    }
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

    const reserved: ReservedLine[] = [];

    try {
      const body = (req.body || {}) as CheckoutBody;
      const eventoId = String(body.eventoId || '').trim();
      const requested = parseRequestedItems(body);
      const comprador = body.comprador || {};

      const nome = String(comprador.nome || '').trim();
      const cpf = String(comprador.cpf || '').replace(/\D/g, '');
      const telefone = String(comprador.telefone || '').trim();
      const email = String(comprador.email || '').trim().toLowerCase();

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
      const reservaExpiraEm = new Date(
        agora.getTime() + RESERVE_MINUTES * 60 * 1000
      );

      for (const line of resolved) {
        await reserveStock(line.ingressoId, line.quantidade);
        reserved.push({
          ingressoId: line.ingressoId,
          quantidade: line.quantidade,
        });
      }

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
        formaPagamento: valorTotal === 0 ? 'gratuito' : 'mercadopago',
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
      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        'eventosociais-c057d';

      let preference: {
        id: string;
        init_point?: string;
        sandbox_init_point?: string;
      };
      try {
        // Checkout Pro atual: com credenciais de teste, usar init_point (www),
        // não sandbox_init_point (legado — costuma cair em congrats/recover/error).
        // back_urls sem query: o token fica no sessionStorage; o MP acrescenta payment_id.
        const successUrl = `${appUrl}/pedido/${pedidoRef.id}/sucesso`;
        const paymentMethods: Record<string, unknown> = {
          excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
          installments: 1,
          default_installments: 1,
        };

        const preferenceBody: Record<string, unknown> = {
          items: resolved.map((l) => ({
            id: l.ingressoId.slice(0, 64),
            title: `${String(evento.titulo || 'Evento')} — ${l.nome}`.slice(
              0,
              256
            ),
            quantity: l.quantidade,
            unit_price: l.valorUnitario,
            currency_id: 'BRL',
            category_id: 'tickets',
          })),
          payer: {
            email: getSandboxPayerEmail(email),
            ...(isMercadoPagoSandbox()
              ? {}
              : {
                  name: nome,
                  identification: { type: 'CPF', number: cpf },
                }),
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
          notification_url: `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`,
          statement_descriptor: 'DELPHOS',
          payment_methods: paymentMethods,
        };

        preference = await mpFetch('/checkout/preferences', {
          method: 'POST',
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
        error:
          error instanceof Error ? error.message : 'Falha ao criar checkout',
      });
    }
  }
);
