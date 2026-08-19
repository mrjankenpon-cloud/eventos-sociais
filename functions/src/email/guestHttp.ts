import * as functions from 'firebase-functions/v1';
import {
  findPedidosByEmail,
  resolveGuestToken,
  sendGuestAccessEmail,
} from '../email/guestAccess';
import { db } from '../mp/helpers';
import { loadEventTicketSummary } from '../mp/eventSummary';
import { allowAttempt, requestIp } from '../http/rateLimit';

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const GENERIC_OK =
  'Se houver compras associadas a este e-mail, enviamos um link seguro para acessar seus ingressos.';

/**
 * Público — guest recovery.
 * Sempre responde a mesma mensagem (anti-enumeração).
 */
export const requestGuestTicketsEmail = functions.https.onRequest(
  async (req, res) => {
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
      if (!allowAttempt(`guest-email:${requestIp(req)}`, 10, 60_000)) {
        res.status(429).json({
          error: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
        });
        return;
      }

      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();

      // Resposta uniforme — mesmo formato se e-mail inválido ou sem pedidos
      const respondOk = async () => {
        await sleep(150 + Math.floor(Math.random() * 200));
        res.json({ ok: true, message: GENERIC_OK });
      };

      if (!email.includes('@') || email.length < 5) {
        await respondOk();
        return;
      }

      const pedidos = await findPedidosByEmail(email);
      if (pedidos.length > 0) {
        const nome = String(pedidos[0].nomeComprador || '');
        // Fire-and-forget interno; resposta já é genérica
        await sendGuestAccessEmail({
          email,
          purpose: 'recovery',
          nome,
        });
      }

      await respondOk();
    } catch (error) {
      functions.logger.error('[requestGuestTicketsEmail]', error);
      // Mesmo assim resposta genérica — não vaza erro de existência
      res.json({ ok: true, message: GENERIC_OK });
    }
  }
);

/**
 * Público — valida token do e-mail e retorna ingressos (somente leitura).
 */
export const getGuestTickets = functions.https.onRequest(async (req, res) => {
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
    if (!allowAttempt(`guest-tickets:${requestIp(req)}`, 40, 60_000)) {
      res.status(429).json({ error: 'Muitas tentativas. Aguarde.' });
      return;
    }

    const token = String(req.body?.token || '').trim();
    const session = await resolveGuestToken(token);
    if (!session) {
      await sleep(200);
      res.status(401).json({
        error: 'Link inválido ou expirado. Solicite um novo acesso por e-mail.',
      });
      return;
    }

    const pedidos = await findPedidosByEmail(session.email);
    const orders = [];

    for (const p of pedidos) {
      // Link de confirmação pode focar um pedido, mas sempre filtra pelo e-mail do token
      if (session.pedidoId && p.id !== session.pedidoId && session.purpose === 'confirmation') {
        // Ainda assim lista todos do e-mail — mais útil para o comprador
      }

      let ticketsSnap = await db()
        .collection('tickets')
        .where('pedidoId', '==', p.id)
        .get();
      if (ticketsSnap.empty) {
        ticketsSnap = await db()
          .collection('tickets')
          .where('compraId', '==', p.id)
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
            natureza: t.natureza || p.natureza || 'entrada',
            ingressoNome: t.ingressoNome || p.ingressoNome,
            checkinRealizado: Boolean(t.checkinRealizado),
            retiradaRealizada: Boolean(t.retiradaRealizada),
          };
        })
        .filter((t) => t.status !== 'Cancelado')
        .sort((a, b) => a.ordem - b.ordem);

      let eventoTitulo = '';
      let eventoData = '';
      let eventoHoraInicio = '';
      let eventoHoraFim = '';
      let eventoLocal = '';
      let eventoEndereco = '';
      let eventoCidade = '';
      if (p.eventoId) {
        const evento = await loadEventTicketSummary(p.eventoId);
        eventoTitulo = evento.titulo;
        eventoData = evento.data;
        eventoHoraInicio = evento.horaInicio;
        eventoHoraFim = evento.horaFim;
        eventoLocal = evento.local;
        eventoEndereco = evento.endereco;
        eventoCidade = evento.cidade;
      }

      orders.push({
        id: p.id,
        status: p.status,
        nomeComprador: p.nomeComprador || '',
        email: p.email || session.email,
        telefone: p.telefone || '',
        cpf: p.cpf || '',
        eventoTitulo,
        eventoData,
        eventoHoraInicio,
        eventoHoraFim,
        eventoLocal,
        eventoEndereco,
        eventoCidade,
        ingressoNome: p.ingressoNome,
        quantidade: p.quantidade,
        valorTotal: p.valorTotal,
        dataCompra: p.dataCompra,
        tickets,
      });
    }

    res.json({
      ok: true,
      email: session.email,
      readOnly: true,
      orders,
    });
  } catch (error) {
    functions.logger.error('[getGuestTickets]', error);
    res.status(500).json({
      error: 'Não foi possível carregar os ingressos',
    });
  }
});
