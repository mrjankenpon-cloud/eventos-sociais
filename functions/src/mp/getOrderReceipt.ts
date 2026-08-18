import * as functions from 'firebase-functions/v1';
import { timingSafeEqual } from 'crypto';
import { db } from './helpers';
import { loadEventTicketSummary } from './eventSummary';

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Recibo de um pedido específico após checkout (retorno MP / sessionStorage).
 * Autorização: somente accessToken do pedido (não e-mail + orderId).
 * Recuperação geral de ingressos: requestGuestTicketsEmail → link no e-mail.
 */
export const getOrderReceipt = functions.https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  try {
    const body = (req.body || {}) as { pedidoId?: string; token?: string };
    const pedidoId = String(body.pedidoId || '').trim();
    const token = String(body.token || '').trim();

    if (!pedidoId || token.length < 32) {
      res.status(404).json({ error: 'Pedido não encontrado ou acesso negado' });
      return;
    }

    const snap = await db().collection('pedidos').doc(pedidoId).get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Pedido não encontrado ou acesso negado' });
      return;
    }

    const pedido = snap.data() || {};
    if (!tokensEqual(String(pedido.accessToken || ''), token)) {
      res.status(404).json({ error: 'Pedido não encontrado ou acesso negado' });
      return;
    }

    let ticketsSnap = await db()
      .collection('tickets')
      .where('pedidoId', '==', pedidoId)
      .get();
    if (ticketsSnap.empty) {
      ticketsSnap = await db()
        .collection('tickets')
        .where('compraId', '==', pedidoId)
        .get();
    }

    const tickets = ticketsSnap.docs
      .map((d) => {
        const t = d.data();
        return {
          id: d.id,
          codigo: t.codigo,
          qrPayload: t.qrPayload || t.codigo,
          status: t.status,
          ordem: t.ordem || 0,
          natureza: t.natureza || pedido.natureza || 'entrada',
          ingressoNome: t.ingressoNome || pedido.ingressoNome,
          checkinRealizado: Boolean(t.checkinRealizado),
          retiradaRealizada: Boolean(t.retiradaRealizada),
        };
      })
      .sort((a, b) => a.ordem - b.ordem);

    let eventoTitulo = '';
    let eventoData = '';
    let eventoHoraInicio = '';
    let eventoHoraFim = '';
    let eventoLocal = '';
    let eventoEndereco = '';
    let eventoCidade = '';
    if (pedido.eventoId) {
      const evento = await loadEventTicketSummary(pedido.eventoId);
      eventoTitulo = evento.titulo;
      eventoData = evento.data;
      eventoHoraInicio = evento.horaInicio;
      eventoHoraFim = evento.horaFim;
      eventoLocal = evento.local;
      eventoEndereco = evento.endereco;
      eventoCidade = evento.cidade;
    }

    res.json({
      ok: true,
      accessToken: String(pedido.accessToken || ''),
      sandbox: (process.env.MERCADOPAGO_MODE || '').toLowerCase() === 'sandbox',
      pedido: {
        id: pedidoId,
        status: pedido.status,
        nomeComprador: pedido.nomeComprador,
        email: pedido.email,
        telefone: pedido.telefone || '',
        cpf: pedido.cpf || '',
        documentoTipo: pedido.documentoTipo === 'cnpj' ? 'cnpj' : 'cpf',
        certificadoNumero: pedido.certificadoNumero || '',
        mensagemDoador: pedido.mensagemDoador || '',
        tipo: pedido.tipo || 'ingresso',
        eventoId: pedido.eventoId,
        eventoTitulo,
        eventoData,
        eventoHoraInicio,
        eventoHoraFim,
        eventoLocal,
        eventoEndereco,
        eventoCidade,
        ingressoNome: pedido.ingressoNome,
        natureza: pedido.natureza,
        quantidade: pedido.quantidade,
        valorUnitario: pedido.valorUnitario,
        valorTotal: pedido.valorTotal,
        itens: Array.isArray(pedido.itens)
          ? (pedido.itens as Array<Record<string, unknown>>).map((row) => ({
              ingressoId: String(row.ingressoId || ''),
              nome: String(row.nome || ''),
              quantidade: Number(row.quantidade) || 0,
              valorUnitario: Number(row.valorUnitario) || 0,
              natureza: row.natureza ? String(row.natureza) : undefined,
            }))
          : [],
        formaPagamento: pedido.formaPagamento,
        mpStatus: pedido.mpStatus || null,
        ticketsEmitidos: Boolean(pedido.ticketsEmitidos),
        dataCompra: pedido.dataCompra,
        reservaExpiraEm: pedido.reservaExpiraEm || null,
        guestCheckout: pedido.guestCheckout !== false,
        linkPagamento: pedido.linkPagamento || pedido.pixTicketUrl || null,
        pixQrCode: pedido.pixQrCode || pedido.qrCode || null,
        pixQrCodeBase64: pedido.pixQrCodeBase64 || null,
        pixTicketUrl: pedido.pixTicketUrl || null,
        pixExpiresAt: pedido.pixExpiresAt || pedido.reservaExpiraEm || null,
      },
      tickets,
    });
  } catch (error) {
    functions.logger.error('[getOrderReceipt]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'erro',
    });
  }
});
