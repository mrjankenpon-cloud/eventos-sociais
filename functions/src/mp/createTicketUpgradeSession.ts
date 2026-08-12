import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';
import {
  db,
  getAppUrl,
  getSandboxPayerEmail,
  isMercadoPagoSandbox,
  mpFetch,
  roundMoney,
} from './helpers';
import { releaseStock, reserveStock } from './stock';

const MASTER_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function requireAdmin(req: functions.Request): Promise<string> {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Autenticação obrigatória');

  const decoded = await admin.auth().verifyIdToken(match[1]);
  if (decoded.uid === MASTER_UID || decoded.master === true) {
    return decoded.uid;
  }
  const role = String(decoded.role || '');
  if (role === 'admin' && decoded.ativo !== false) return decoded.uid;

  const userSnap = await db().collection('usuarios').doc(decoded.uid).get();
  const user = userSnap.data();
  if (user && user.ativo !== false && String(user.role || '') === 'admin') {
    return decoded.uid;
  }
  throw new Error('Sem permissão (somente administrador)');
}

function isMeiaKey(key: string, nome: string): boolean {
  const k = key.toLowerCase();
  const n = nome.toLowerCase();
  return k === 'meia' || n.includes('meia');
}

function isInteiraKey(key: string, nome: string): boolean {
  const k = key.toLowerCase();
  const n = nome.toLowerCase();
  return k === 'inteira' || (n.includes('inteira') && !n.includes('meia'));
}

/**
 * Cria checkout MP pela diferença meia → inteira.
 * Body: { ticketId, toIngressoId? }
 */
export const createTicketUpgradeSession = functions.https.onRequest(
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

    let reservedInteiraId = '';
    try {
      const uid = await requireAdmin(req);
      const ticketId = String(req.body?.ticketId || '').trim();
      const toIngressoIdForced = String(req.body?.toIngressoId || '').trim();
      if (!ticketId) {
        res.status(400).json({ error: 'ticketId obrigatório' });
        return;
      }

      const ticketRef = db().collection('tickets').doc(ticketId);
      const ticketSnap = await ticketRef.get();
      if (!ticketSnap.exists) {
        res.status(404).json({ error: 'Ticket não encontrado' });
        return;
      }
      const ticket = ticketSnap.data() || {};
      if (String(ticket.status || '') !== 'Disponível') {
        throw new Error('Só é possível upgrade de ticket Disponível');
      }
      if (ticket.upgradePedidoId) {
        const prev = await db()
          .collection('pedidos')
          .doc(String(ticket.upgradePedidoId))
          .get();
        if (prev.exists && String(prev.data()?.status) === 'pendente') {
          const p = prev.data() || {};
          res.json({
            ok: true,
            already: true,
            pedidoId: prev.id,
            initPoint: p.linkPagamento || null,
            diff: Number(p.valorTotal) || 0,
          });
          return;
        }
      }

      const fromKey = String(ticket.ingressoKey || '');
      const fromNome = String(ticket.ingressoNome || '');
      if (!isMeiaKey(fromKey, fromNome)) {
        throw new Error('Upgrade disponível apenas para ingresso meia');
      }

      const eventoId = String(ticket.eventoId || '');
      const pedidoOrigemId = String(ticket.pedidoId || ticket.compraId || '');
      if (!eventoId || !pedidoOrigemId) {
        throw new Error('Ticket sem evento/pedido de origem');
      }

      const origemSnap = await db()
        .collection('pedidos')
        .doc(pedidoOrigemId)
        .get();
      if (!origemSnap.exists) throw new Error('Pedido de origem não encontrado');
      const origem = origemSnap.data() || {};
      if (String(origem.status) !== 'confirmado') {
        throw new Error('Pedido de origem precisa estar confirmado');
      }

      const fromIngressoId = String(ticket.ingressoId || '');
      let meiaUnit = 0;
      const itens = Array.isArray(origem.itens)
        ? (origem.itens as Array<Record<string, unknown>>)
        : [];
      const line = itens.find(
        (i) => String(i.ingressoId || '') === fromIngressoId
      );
      if (line) meiaUnit = Number(line.valorUnitario) || 0;
      if (meiaUnit <= 0) meiaUnit = Number(origem.valorUnitario) || 0;
      if (meiaUnit <= 0 && fromIngressoId) {
        const meiaDoc = await db()
          .collection('ingressos')
          .doc(fromIngressoId)
          .get();
        meiaUnit = Number(meiaDoc.data()?.valor) || 0;
      }

      const ingressosSnap = await db()
        .collection('ingressos')
        .where('eventoId', '==', eventoId)
        .get();
      let toIngresso: (Record<string, unknown> & { id: string }) | null = null;
      let toIngressoId = toIngressoIdForced;

      for (const d of ingressosSnap.docs) {
        const data = d.data() || {};
        if (toIngressoIdForced && d.id !== toIngressoIdForced) continue;
        if (data.ativo === false) continue;
        const key = String(data.key || '');
        const nome = String(data.nome || '');
        if (isInteiraKey(key, nome)) {
          toIngresso = { id: d.id, ...data };
          toIngressoId = d.id;
          break;
        }
      }
      if (!toIngresso || !toIngressoId) {
        throw new Error('Não há ingresso Inteira ativo neste evento');
      }

      const inteiraValor = Number(toIngresso.valor) || 0;
      const diff = roundMoney(inteiraValor - meiaUnit);
      if (diff <= 0) {
        throw new Error(
          'Não há diferença a cobrar (inteira ≤ meia neste evento)'
        );
      }

      await reserveStock(toIngressoId, 1);
      reservedInteiraId = toIngressoId;

      const accessToken = randomBytes(32).toString('hex');
      const agora = new Date();
      const reservaExpiraEm = new Date(agora.getTime() + 15 * 60 * 1000);
      const pedidoRef = db().collection('pedidos').doc();

      const eventoSnap = await db().collection('eventos').doc(eventoId).get();
      const eventoTitulo = String(eventoSnap.data()?.titulo || 'Evento');

      const basePedido = {
        tipo: 'upgrade',
        ticketId,
        pedidoOrigemId,
        fromIngressoId,
        toIngressoId,
        eventoId,
        nomeComprador: String(origem.nomeComprador || ''),
        cpf: String(origem.cpf || ''),
        telefone: String(origem.telefone || ''),
        email: String(origem.email || ''),
        ingressoId: toIngressoId,
        ingressoKey: String(toIngresso.key || 'inteira'),
        ingressoNome: String(toIngresso.nome || 'Inteira'),
        natureza: String(toIngresso.natureza || 'entrada'),
        itens: [
          {
            ingressoId: toIngressoId,
            nome: `Upgrade meia → ${toIngresso.nome || 'Inteira'}`,
            key: String(toIngresso.key || 'inteira'),
            natureza: String(toIngresso.natureza || 'entrada'),
            quantidade: 1,
            valorUnitario: diff,
          },
        ],
        quantidade: 1,
        valorUnitario: diff,
        valorTotal: diff,
        status: 'pendente',
        formaPagamento: 'mercadopago',
        estoqueReservado: true,
        reservaExpiraEm: reservaExpiraEm.toISOString(),
        ticketsEmitidos: true,
        accessToken,
        guestCheckout: true,
        createdByAdmin: uid,
        dataCompra: agora.toISOString(),
        ativo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const appUrl = getAppUrl();
      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        'eventosociais-c057d';
      const successUrl = `${appUrl}/pedido/${pedidoRef.id}/sucesso`;
      const email = String(origem.email || '').toLowerCase();

      const preference = await mpFetch<{
        id: string;
        init_point?: string;
        sandbox_init_point?: string;
      }>('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              id: toIngressoId.slice(0, 64),
              title: `${eventoTitulo} — upgrade meia→inteira`.slice(0, 256),
              quantity: 1,
              unit_price: diff,
              currency_id: 'BRL',
              category_id: 'tickets',
            },
          ],
          payer: {
            email: getSandboxPayerEmail(email),
            ...(isMercadoPagoSandbox()
              ? {}
              : {
                  name: String(origem.nomeComprador || ''),
                  identification: {
                    type: 'CPF',
                    number: String(origem.cpf || '').replace(/\D/g, ''),
                  },
                }),
          },
          external_reference: pedidoRef.id,
          metadata: {
            pedidoId: pedidoRef.id,
            tipo: 'upgrade',
            ticketId,
            eventoId,
            fromIngressoId,
            toIngressoId,
          },
          back_urls: {
            success: successUrl,
            pending: successUrl,
            failure: successUrl,
          },
          auto_return: 'approved',
          notification_url: `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`,
          statement_descriptor: 'DELPHOS',
          payment_methods: {
            excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
            installments: 1,
            default_installments: 1,
          },
        }),
      });

      const initPoint =
        preference.init_point || preference.sandbox_init_point || '';

      await pedidoRef.set({
        ...basePedido,
        mpPreferenceId: preference.id,
        linkPagamento: initPoint,
      });

      await ticketRef.update({
        upgradePedidoId: pedidoRef.id,
        upgradeStatus: 'pendente',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      reservedInteiraId = '';

      res.json({
        ok: true,
        pedidoId: pedidoRef.id,
        ticketId,
        diff,
        fromValor: meiaUnit,
        toValor: inteiraValor,
        toIngressoNome: String(toIngresso.nome || 'Inteira'),
        initPoint,
        accessToken,
        receiptUrl: `${appUrl}/pedido/${pedidoRef.id}/sucesso?token=${accessToken}`,
      });
    } catch (error) {
      if (reservedInteiraId) {
        await releaseStock(reservedInteiraId, 1).catch(() => undefined);
      }
      functions.logger.error('[createTicketUpgradeSession]', error);
      const msg = error instanceof Error ? error.message : 'erro';
      const status =
        msg.includes('Autenticação') || msg.includes('permissão') ? 403 : 500;
      res.status(status).json({ error: msg });
    }
  }
);

/** Aplica upgrade no ticket após pagamento aprovado. */
export async function applyTicketUpgrade(
  upgradePedidoId: string
): Promise<void> {
  const pedidoRef = db().collection('pedidos').doc(upgradePedidoId);
  const snap = await pedidoRef.get();
  if (!snap.exists) return;
  const pedido = snap.data() || {};
  if (String(pedido.tipo || '') !== 'upgrade') return;

  const ticketId = String(pedido.ticketId || '');
  const fromIngressoId = String(pedido.fromIngressoId || '');
  const toIngressoId = String(pedido.toIngressoId || '');
  if (!ticketId || !toIngressoId) return;

  const toSnap = await db().collection('ingressos').doc(toIngressoId).get();
  const toData = toSnap.data() || {};

  await db().runTransaction(async (tx) => {
    const ticketRef = db().collection('tickets').doc(ticketId);
    const ticketSnap = await tx.get(ticketRef);
    if (!ticketSnap.exists) return;
    const ticket = ticketSnap.data() || {};
    if (ticket.upgradedToInteira === true) return;

    tx.update(ticketRef, {
      ingressoId: toIngressoId,
      ingressoKey: String(toData.key || pedido.ingressoKey || 'inteira'),
      ingressoNome: String(toData.nome || pedido.ingressoNome || 'Inteira'),
      natureza: String(toData.natureza || pedido.natureza || 'entrada'),
      upgradedToInteira: true,
      upgradePedidoId: upgradePedidoId,
      upgradeStatus: 'confirmado',
      upgradedAt: new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(pedidoRef, {
      status: 'confirmado',
      estoqueReservado: false,
      ticketsEmitidos: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  if (fromIngressoId) {
    await releaseStock(fromIngressoId, 1);
  }
}
