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

type CheckoutBody = {
  eventoId?: string;
  ingressoId?: string;
  quantidade?: number;
  comprador?: {
    nome?: string;
    cpf?: string;
    telefone?: string;
    email?: string;
  };
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

    let reservedQty = 0;
    let reservedIngressoId = '';

    try {
      const body = (req.body || {}) as CheckoutBody;
      const eventoId = String(body.eventoId || '').trim();
      const ingressoId = String(body.ingressoId || '').trim();
      const quantidade = Math.floor(Number(body.quantidade) || 0);
      const comprador = body.comprador || {};

      const nome = String(comprador.nome || '').trim();
      const cpf = String(comprador.cpf || '').replace(/\D/g, '');
      const telefone = String(comprador.telefone || '').trim();
      const email = String(comprador.email || '').trim().toLowerCase();

      if (!eventoId || !ingressoId) {
        res.status(400).json({ error: 'eventoId e ingressoId obrigatórios' });
        return;
      }
      if (quantidade < 1) {
        res.status(400).json({ error: 'Quantidade inválida' });
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

      const ingressoSnap = await db()
        .collection('ingressos')
        .doc(ingressoId)
        .get();
      if (!ingressoSnap.exists) {
        res.status(404).json({ error: 'Tipo de ingresso não encontrado' });
        return;
      }
      const ingresso = (ingressoSnap.data() || {}) as Record<string, unknown>;
      if (String(ingresso.eventoId) !== eventoId) {
        res.status(400).json({ error: 'Ingresso não pertence a este evento' });
        return;
      }
      if (ingresso.ativo === false) {
        res.status(400).json({ error: 'Tipo de ingresso inativo' });
        return;
      }

      const limite =
        Number(ingresso.limitePorCompra) > 0
          ? Number(ingresso.limitePorCompra)
          : Number(evento.limitePorCompra) > 0
            ? Number(evento.limitePorCompra)
            : 10;
      if (quantidade > limite) {
        res
          .status(400)
          .json({ error: `Limite de ${limite} ingresso(s) por compra` });
        return;
      }

      // Preço oficial — nunca confiar no frontend
      const valorUnitario = roundMoney(Number(ingresso.valor) || 0);
      const valorTotal = roundMoney(valorUnitario * quantidade);
      const natureza = String(ingresso.natureza || 'entrada');
      const accessToken = randomToken(32);
      const agora = new Date();
      const reservaExpiraEm = new Date(
        agora.getTime() + RESERVE_MINUTES * 60 * 1000
      );

      await reserveStock(ingressoId, quantidade);
      reservedQty = quantidade;
      reservedIngressoId = ingressoId;

      const pedidoRef = db().collection('pedidos').doc();
      const basePedido: Record<string, unknown> = {
        nomeComprador: nome,
        cpf,
        telefone,
        email,
        eventoId,
        ingressoId,
        ingressoKey: String(ingresso.key || ''),
        ingressoNome: String(ingresso.nome || 'Ingresso'),
        natureza,
        itens: [
          {
            ingressoId,
            nome: String(ingresso.nome || 'Ingresso'),
            quantidade,
            valorUnitario,
          },
        ],
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
        /** Guest checkout: sem userId / Auth de comprador */
        guestCheckout: true,
        ativo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (valorTotal === 0) {
        await pedidoRef.set(basePedido);
        reservedQty = 0;
        const emit = await emitTicketsForPedido(pedidoRef.id, {
          ...basePedido,
          ticketsEmitidos: false,
        });
        functions.logger.info('[createCheckoutSession] gratuito', {
          pedidoId: pedidoRef.id,
          tickets: emit.count,
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
        // Preferência enxuta: campos extras (expires/binary_mode/parcelas forçadas)
        // têm causado botão "Pagar" cinza no Checkout Pro sandbox.
        const preferenceBody: Record<string, unknown> = {
          items: [
            {
              id: ingressoId.slice(0, 64),
              title: `${String(evento.titulo || 'Evento')} — ${String(ingresso.nome || 'Ingresso')}`.slice(
                0,
                256
              ),
              quantity: quantidade,
              unit_price: valorUnitario,
              currency_id: 'BRL',
              category_id: 'tickets',
            },
          ],
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
            ingressoId,
            natureza,
          },
          back_urls: {
            success: `${appUrl}/pedido/${pedidoRef.id}/sucesso?token=${accessToken}`,
            pending: `${appUrl}/pedido/${pedidoRef.id}/sucesso?token=${accessToken}`,
            failure: `${appUrl}/evento/${eventoId}/inscricao`,
          },
          auto_return: 'approved',
          notification_url: `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`,
          statement_descriptor: 'DELPHOS',
          payment_methods: {
            excluded_payment_methods: [],
            excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
            installments: 1,
            default_installments: 1,
          },
        };

        preference = await mpFetch('/checkout/preferences', {
          method: 'POST',
          body: JSON.stringify(preferenceBody),
        });
      } catch (mpError) {
        await releaseStock(ingressoId, quantidade);
        reservedQty = 0;
        throw mpError;
      }

      const initPoint =
        isMercadoPagoSandbox()
          ? preference.sandbox_init_point || preference.init_point || ''
          : preference.init_point || preference.sandbox_init_point || '';

      await pedidoRef.set({
        ...basePedido,
        mpPreferenceId: preference.id,
        linkPagamento: initPoint,
      });
      reservedQty = 0;

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
      if (reservedQty > 0 && reservedIngressoId) {
        try {
          await releaseStock(reservedIngressoId, reservedQty);
        } catch (releaseErr) {
          functions.logger.error(
            '[createCheckoutSession] falha ao liberar estoque',
            releaseErr
          );
        }
      }
      functions.logger.error('[createCheckoutSession]', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Falha ao criar checkout',
      });
    }
  }
);
