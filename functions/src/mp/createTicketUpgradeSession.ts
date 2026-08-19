import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';
import {
  createPixCharge,
  clientSafeMessage,
  db,
  getAppUrl,
  mapOrderStatusToMp,
  MpOrderPix,
  mpFetch,
  roundMoney,
} from './helpers';
import { releaseStock, reserveStock, transitionPedidoReleaseStock } from './stock';

const MASTER_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';
/** PIX no MP exige no mínimo ~30 min. */
const PIX_MINUTES = 30;

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function requireStaff(req: functions.Request): Promise<string> {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Autenticação obrigatória');

  const decoded = await admin.auth().verifyIdToken(match[1]);
  if (decoded.uid === MASTER_UID || decoded.master === true) {
    return decoded.uid;
  }
  const role = String(decoded.role || '');
  if (
    ['admin', 'editor', 'operador'].includes(role) &&
    decoded.ativo !== false
  ) {
    return decoded.uid;
  }

  const userSnap = await db().collection('usuarios').doc(decoded.uid).get();
  const user = userSnap.data();
  if (
    user &&
    user.ativo !== false &&
    ['admin', 'editor', 'operador'].includes(String(user.role || ''))
  ) {
    return decoded.uid;
  }
  throw new Error('Sem permissão');
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

function isoWithOffset(date: Date): string {
  const pad = (n: number) => String(Math.trunc(n)).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(offsetMin) / 60));
  const om = pad(Math.abs(offsetMin) % 60);
  return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}${sign}${oh}:${om}`;
}

async function createPixPayment(input: {
  pedidoId: string;
  diff: number;
  description: string;
  email: string;
  name: string;
  cpf: string;
  ticketId: string;
  eventoId: string;
  expiresAt: string;
}) {
  return createPixCharge({
    pedidoId: input.pedidoId,
    valor: input.diff,
    description: input.description,
    email: input.email,
    nome: input.name,
    documento: input.cpf,
    documentoTipo: 'cpf',
    expiresAt: input.expiresAt,
    idempotencyKey: `upgrade-pix-${input.pedidoId}`,
  });
}

function jsonPix(res: functions.Response, payload: Record<string, unknown>) {
  res.json({
    ok: true,
    pix: true,
    ...payload,
  });
}

async function expireUpgradePedido(pedidoId: string, ticketId: string) {
  await transitionPedidoReleaseStock({
    pedidoId,
    fromStatuses: ['pendente'],
    toStatus: 'expirado',
  });
  await db()
    .collection('tickets')
    .doc(ticketId)
    .update({
      upgradeStatus: 'expirado',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    .catch(() => undefined);
}

/**
 * Cria cobrança PIX (QR + copia-e-cola) pela diferença meia → inteira.
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
    let createdPedidoId = '';
    let ticketIdForCleanup = '';
    try {
      const uid = await requireStaff(req);
      const ticketId = String(req.body?.ticketId || '').trim();
      ticketIdForCleanup = ticketId;
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
      if (ticket.upgradedToInteira === true) {
        jsonPix(res, {
          ticketId,
          confirmed: true,
          already: true,
          toIngressoNome: String(ticket.ingressoNome || 'Inteira'),
          diff: 0,
        });
        return;
      }
      if (String(ticket.status || '') !== 'Disponível') {
        throw new Error('Só é possível upgrade de ticket Disponível');
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

      const appUrl = getAppUrl();
      const eventoSnap = await db().collection('eventos').doc(eventoId).get();
      const eventoTitulo = String(eventoSnap.data()?.titulo || 'Evento');

      const pixPayer = {
        email: String(origem.email || ''),
        name: String(origem.nomeComprador || ''),
        cpf: String(origem.cpf || ''),
        ticketId,
        eventoId,
        description: `${eventoTitulo} — diferença meia→inteira`,
        diff,
      };

      const existingId = String(ticket.upgradePedidoId || '').trim();
      if (existingId) {
        const prev = await db().collection('pedidos').doc(existingId).get();
        if (prev.exists) {
          const p = prev.data() || {};
          const prevStatus = String(p.status || '');
          const expira = new Date(String(p.pixExpiresAt || p.reservaExpiraEm || ''));
          const stillValid =
            prevStatus === 'pendente' &&
            !Number.isNaN(expira.getTime()) &&
            expira.getTime() > Date.now() + 20_000;

          if (prevStatus === 'confirmado') {
            await applyTicketUpgrade(existingId);
            jsonPix(res, {
              pedidoId: existingId,
              ticketId,
              diff,
              fromValor: meiaUnit,
              toValor: inteiraValor,
              toIngressoNome: String(toIngresso.nome || 'Inteira'),
              confirmed: true,
              already: true,
            });
            return;
          }

          const mpOrderId = String(p.mpOrderId || '');
          const mpPaymentId = String(p.mpPaymentId || '');
          if (stillValid && (mpOrderId || mpPaymentId)) {
            try {
              let approved = false;
              if (mpOrderId.startsWith('ORD')) {
                const live = await mpFetch<MpOrderPix>(
                  `/v1/orders/${mpOrderId}`
                );
                approved =
                  mapOrderStatusToMp(live.status, live.status_detail) ===
                  'approved';
              } else if (/^\d+$/.test(mpPaymentId)) {
                const live = await mpFetch<{ status?: string }>(
                  `/v1/payments/${mpPaymentId}`
                );
                approved = String(live.status) === 'approved';
              }
              if (approved) {
                await applyTicketUpgrade(existingId);
                jsonPix(res, {
                  pedidoId: existingId,
                  ticketId,
                  diff,
                  fromValor: meiaUnit,
                  toValor: inteiraValor,
                  toIngressoNome: String(toIngresso.nome || 'Inteira'),
                  confirmed: true,
                });
                return;
              }
            } catch (err) {
              functions.logger.warn('[createTicketUpgradeSession] poll pix', err);
            }
          }

          const qrCode = String(p.pixQrCode || '');
          if (stillValid && qrCode) {
            jsonPix(res, {
              pedidoId: existingId,
              ticketId,
              diff: Number(p.valorTotal) || diff,
              fromValor: meiaUnit,
              toValor: inteiraValor,
              toIngressoNome: String(toIngresso.nome || 'Inteira'),
              qrCode,
              qrCodeBase64: String(p.pixQrCodeBase64 || ''),
              ticketUrl: String(p.pixTicketUrl || p.linkPagamento || ''),
              expiresAt: String(p.pixExpiresAt || p.reservaExpiraEm || ''),
              already: true,
            });
            return;
          }

          if (stillValid && !qrCode) {
            const expiresAt = isoWithOffset(
              new Date(Date.now() + PIX_MINUTES * 60 * 1000)
            );
            const pix = await createPixPayment({
              ...pixPayer,
              pedidoId: existingId,
              expiresAt,
            });
            await prev.ref.update({
              formaPagamento: 'pix',
              mpPaymentId: pix.paymentId,
              mpOrderId: pix.orderId || null,
              mpOrderPaymentId: pix.orderPaymentId || null,
              pixQrCode: pix.qrCode,
              pixQrCodeBase64: pix.qrCodeBase64 || '',
              pixTicketUrl: pix.ticketUrl,
              pixExpiresAt: pix.expiresAt || expiresAt,
              reservaExpiraEm: pix.expiresAt || expiresAt,
              linkPagamento: pix.ticketUrl || '',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            jsonPix(res, {
              pedidoId: existingId,
              ticketId,
              diff: Number(p.valorTotal) || diff,
              fromValor: meiaUnit,
              toValor: inteiraValor,
              toIngressoNome: String(toIngresso.nome || 'Inteira'),
              qrCode: pix.qrCode,
              qrCodeBase64: pix.qrCodeBase64,
              ticketUrl: pix.ticketUrl,
              expiresAt: pix.expiresAt || expiresAt,
              already: true,
            });
            return;
          }

          if (prevStatus === 'pendente') {
            await expireUpgradePedido(existingId, ticketId);
          }
        }
      }

      await reserveStock(toIngressoId, 1);
      reservedInteiraId = toIngressoId;

      const accessToken = randomBytes(32).toString('hex');
      const agora = new Date();
      const reservaExpiraEm = new Date(agora.getTime() + PIX_MINUTES * 60 * 1000);
      const expiresAt = isoWithOffset(reservaExpiraEm);
      const pedidoRef = db().collection('pedidos').doc();

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
        formaPagamento: 'pix',
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

      await pedidoRef.set(basePedido);
      createdPedidoId = pedidoRef.id;

      await ticketRef.update({
        upgradePedidoId: pedidoRef.id,
        upgradeStatus: 'pendente',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const pix = await createPixPayment({
        ...pixPayer,
        pedidoId: pedidoRef.id,
        expiresAt,
      });

      await pedidoRef.update({
        mpPaymentId: pix.paymentId,
        mpOrderId: pix.orderId || null,
        mpOrderPaymentId: pix.orderPaymentId || null,
        pixQrCode: pix.qrCode,
        pixQrCodeBase64: pix.qrCodeBase64 || '',
        pixTicketUrl: pix.ticketUrl,
        pixExpiresAt: pix.expiresAt || expiresAt,
        reservaExpiraEm: pix.expiresAt || reservaExpiraEm.toISOString(),
        linkPagamento: pix.ticketUrl || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      reservedInteiraId = '';

      jsonPix(res, {
        pedidoId: pedidoRef.id,
        ticketId,
        diff,
        fromValor: meiaUnit,
        toValor: inteiraValor,
        toIngressoNome: String(toIngresso.nome || 'Inteira'),
        qrCode: pix.qrCode,
        qrCodeBase64: pix.qrCodeBase64,
        ticketUrl: pix.ticketUrl,
        expiresAt: pix.expiresAt || expiresAt,
        receiptUrl: `${appUrl}/pedido/${pedidoRef.id}/sucesso?token=${accessToken}`,
      });
    } catch (error) {
      if (createdPedidoId && ticketIdForCleanup) {
        await expireUpgradePedido(createdPedidoId, ticketIdForCleanup).catch(
          () => undefined
        );
      } else if (reservedInteiraId) {
        await releaseStock(reservedInteiraId, 1).catch(() => undefined);
      }
      functions.logger.error('[createTicketUpgradeSession]', error);
      const raw = error instanceof Error ? error.message : '';
      const status =
        raw.includes('Autenticação') || raw.includes('permissão') ? 403 : 500;
      res.status(status).json({
        error: clientSafeMessage(error, 'Falha ao gerar upgrade'),
      });
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

    const fromNome = String(ticket.ingressoNome || 'Meia');
    tx.update(ticketRef, {
      ingressoId: toIngressoId,
      ingressoKey: String(toData.key || pedido.ingressoKey || 'inteira'),
      ingressoNome: String(toData.nome || pedido.ingressoNome || 'Inteira'),
      natureza: String(toData.natureza || pedido.natureza || 'entrada'),
      upgradedToInteira: true,
      upgradeFromNome: fromNome,
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
