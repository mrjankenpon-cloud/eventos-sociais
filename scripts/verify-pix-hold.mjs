/**
 * Verifica lógica da reserva PIX 10 dias / textos alinhados (status + dica).
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

function pixRemainingWholeDays(expiresAt, nowMs = Date.now()) {
  const ms = pixRemainingMs(expiresAt, nowMs);
  if (ms == null) return null;
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86_400_000));
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

function ticketPixCopy(expiresAt, nowMs = Date.now()) {
  const msLeft = pixRemainingMs(expiresAt, nowMs);
  const expired = msLeft != null && msLeft <= 0;
  if (expired) {
    return {
      expired: true,
      statusLabel: 'PIX expirado — inicie uma nova compra',
      hint: 'O prazo desta reserva acabou. Faça uma nova compra se ainda houver vagas.',
    };
  }
  const deadline = formatPixDeadlineDate(expiresAt);
  const days = pixRemainingWholeDays(expiresAt, nowMs);
  const holdDays = days != null && days > 0 ? days : PIX_TICKET_HOLD_DAYS;
  const statusLabel = deadline
    ? `Aguardando pagamento · pague até ${deadline}`
    : `Aguardando pagamento · prazo de ${holdDays} dias`;
  const hint = deadline
    ? `Abra o app do banco, escaneie o QR ou cole o código. A vaga fica reservada até ${deadline} (cerca de ${holdDays} dia${holdDays === 1 ? '' : 's'}) — você pode enviar este PIX para outra pessoa pagar. Os ingressos são emitidos automaticamente após a confirmação.`
    : `Abra o app do banco, escaneie o QR ou cole o código. A vaga fica reservada por até ${PIX_TICKET_HOLD_DAYS} dias para pagamento. Os ingressos aparecem aqui após a confirmação.`;
  return { expired: false, statusLabel, hint };
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

function iso8601DurationFromMinutes(minutes) {
  const total = Math.max(1, Math.round(minutes));
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const mins = total % 60;
  if (days > 0) {
    let out = `P${days}D`;
    if (hours > 0 || mins > 0) {
      out += 'T';
      if (hours > 0) out += `${hours}H`;
      if (mins > 0) out += `${mins}M`;
    }
    return out;
  }
  if (hours > 0) {
    return mins > 0 ? `PT${hours}H${mins}M` : `PT${hours}H`;
  }
  return `PT${mins}M`;
}

const now = Date.parse('2026-10-26T19:00:00.000Z');
const in10d = new Date(
  now + PIX_TICKET_HOLD_DAYS * 24 * 60 * 60 * 1000
).toISOString();
const in15m = new Date(now + PIX_COUNTDOWN_MINUTES * 60 * 1000).toISOString();
const past = new Date(now - 60_000).toISOString();

const copy10 = ticketPixCopy(in10d, now);
assert.match(copy10.statusLabel, /pague até/i);
assert.match(copy10.hint, /reservada até/i);
assert.match(copy10.hint, /cerca de 10 dias/i);
assert.doesNotMatch(copy10.statusLabel, /Tempo restante/i);
// Status e dica usam a MESMA data — sem prometer 10 dias com prazo de hoje.
const deadline = formatPixDeadlineDate(in10d);
assert.ok(copy10.statusLabel.includes(deadline));
assert.ok(copy10.hint.includes(deadline));

const copyShort = ticketPixCopy(in15m, now);
const shortDeadline = formatPixDeadlineDate(in15m);
assert.ok(copyShort.statusLabel.includes(shortDeadline));
assert.ok(copyShort.hint.includes(shortDeadline));
assert.doesNotMatch(copyShort.hint, /por até 10 dias/);

const expired = ticketPixCopy(past, now);
assert.equal(expired.expired, true);
assert.match(expired.statusLabel, /expirado/i);

const donationClock = formatPixCountdown(in15m, {
  maxMinutes: PIX_COUNTDOWN_MINUTES,
  nowMs: now,
});
assert.match(donationClock, /^\d{2}:\d{2}$/);

assert.equal(iso8601DurationFromMinutes(10 * 24 * 60), 'P10D');
assert.equal(iso8601DurationFromMinutes(30), 'PT30M');

console.log('verify-pix-hold: ok');
console.log('  10d status:', copy10.statusLabel);
console.log('  10d hint snippet:', copy10.hint.slice(0, 120) + '…');
console.log('  short status:', copyShort.statusLabel);
console.log('  P10D:', iso8601DurationFromMinutes(14400));
