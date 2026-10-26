/**
 * Verifica lógica da reserva PIX 10 dias / contagem sem cronômetro MM:SS
 * e metadados de status "Não faturados".
 */
import assert from 'node:assert/strict';

const PIX_TICKET_HOLD_DAYS = 10;
const PIX_COUNTDOWN_MINUTES = 15;

function pixRemainingMs(expiresAt, nowMs = Date.now()) {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  return end - nowMs;
}

function formatPixCountdown(expiresAt, opts = {}) {
  const msLeftRaw = pixRemainingMs(expiresAt, opts.nowMs);
  if (msLeftRaw == null) return '';
  if (msLeftRaw <= 0) return 'Expirado';

  let displayMs = msLeftRaw;
  if (opts.maxMinutes != null && opts.maxMinutes > 0) {
    const maxMs = opts.maxMinutes * 60 * 1000;
    displayMs =
      msLeftRaw > maxMs * 2 ? maxMs : Math.min(msLeftRaw, maxMs);
  }

  const totalSec = Math.floor(displayMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(min).padStart(2, '0')}m`;
  }
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatPixDeadlineDate(expiresAt) {
  if (!expiresAt) return '';
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function ticketStatusLabel(expiresAt, nowMs = Date.now()) {
  const msLeft = pixRemainingMs(expiresAt, nowMs);
  const expired = msLeft != null && msLeft <= 0;
  if (expired) return 'PIX expirado — inicie uma nova compra';
  const deadline = formatPixDeadlineDate(expiresAt);
  return deadline
    ? `Aguardando pagamento · pague até ${deadline}`
    : `Aguardando pagamento · prazo de ${PIX_TICKET_HOLD_DAYS} dias`;
}

function isUninvoicedPurchase(p) {
  return p.statusPagamento === 'pendente' || p.statusPagamento === 'expirado';
}

function uninvoicedStatusMeta(p, nowMs = Date.now()) {
  if (p.statusPagamento === 'expirado') {
    return {
      label: 'Expirado',
      variant: 'danger',
      detail: 'Prazo encerrado · vaga liberada',
    };
  }
  const end = p.reservaExpiraEm ? new Date(p.reservaExpiraEm) : null;
  if (end && !Number.isNaN(end.getTime()) && end.getTime() <= nowMs) {
    return {
      label: 'Expirado',
      variant: 'danger',
      detail: 'Prazo encerrado · vaga liberada',
    };
  }
  const prazo =
    end && !Number.isNaN(end.getTime())
      ? `No prazo · até ${end.toLocaleDateString('pt-BR')}`
      : 'Aguardando pagamento';
  return { label: 'Aguardando', variant: 'warning', detail: prazo };
}

const now = Date.parse('2026-10-26T19:00:00.000Z');
const in10d = new Date(now + PIX_TICKET_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
const in15m = new Date(now + PIX_COUNTDOWN_MINUTES * 60 * 1000).toISOString();
const past = new Date(now - 60_000).toISOString();

// Ingresso: sem formato MM:SS no rótulo (só data / prazo).
const ticketLabel = ticketStatusLabel(in10d, now);
assert.match(ticketLabel, /pague até/i);
assert.doesNotMatch(ticketLabel, /Tempo restante/i);
assert.doesNotMatch(ticketLabel, /\d{2}:\d{2}/);

const expiredLabel = ticketStatusLabel(past, now);
assert.match(expiredLabel, /expirado/i);

// Doação: ainda usa countdown curto.
const donationClock = formatPixCountdown(in15m, {
  maxMinutes: PIX_COUNTDOWN_MINUTES,
  nowMs: now,
});
assert.match(donationClock, /^\d{2}:\d{2}$/);

const longDonation = formatPixCountdown(in10d, {
  maxMinutes: PIX_COUNTDOWN_MINUTES,
  nowMs: now,
});
assert.equal(longDonation, '15:00');

// Card conta só pendentes; lista inclui expirados.
const purchases = [
  { statusPagamento: 'pendente', quantidadeIngressos: 2, reservaExpiraEm: in10d },
  { statusPagamento: 'pendente', quantidadeIngressos: 1, reservaExpiraEm: in10d },
  { statusPagamento: 'expirado', quantidadeIngressos: 3, reservaExpiraEm: past },
  { statusPagamento: 'confirmado', quantidadeIngressos: 4 },
];
const cardCount = purchases
  .filter((p) => p.statusPagamento === 'pendente')
  .reduce((acc, p) => acc + p.quantidadeIngressos, 0);
const list = purchases.filter(isUninvoicedPurchase);
assert.equal(cardCount, 3);
assert.equal(list.length, 3);
assert.equal(uninvoicedStatusMeta(purchases[0], now).label, 'Aguardando');
assert.equal(uninvoicedStatusMeta(purchases[2], now).label, 'Expirado');
assert.equal(
  uninvoicedStatusMeta(
    { statusPagamento: 'pendente', reservaExpiraEm: past },
    now
  ).label,
  'Expirado'
);

console.log('verify-pix-hold: ok');
console.log('  ticket label:', ticketLabel);
console.log('  donation clock:', donationClock);
console.log('  card count (pending tickets):', cardCount);
console.log('  list rows (pending+expired):', list.length);
