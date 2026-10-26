/** Contagem regressiva do QR PIX (usa a data de reserva gravada no pedido). */

/** Janela padrão de doação / legado (minutos). */
export const PIX_COUNTDOWN_MINUTES = 15;

/** Janela de compra de ingresso via PIX (dias). */
export const PIX_TICKET_HOLD_DAYS = 10;

export function pixRemainingMs(
  expiresAt?: string | null,
  nowMs: number = Date.now()
): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  return end - nowMs;
}

/** Dias civis restantes (ceil), para textos de prazo do ingresso. */
export function pixRemainingWholeDays(
  expiresAt?: string | null,
  nowMs: number = Date.now()
): number | null {
  const ms = pixRemainingMs(expiresAt, nowMs);
  if (ms == null) return null;
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

/** Data limite do PIX de ingresso em pt-BR (dd/mm/aaaa). */
export function formatPixDeadlineDate(
  expiresAt?: string | null
): string {
  if (!expiresAt) return '';
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Textos alinhados do PIX de ingresso (status + dica).
 * Sempre usam a mesma `expiresAt` — nunca prometem 10 dias se a reserva for curta.
 */
export function ticketPixCopy(
  expiresAt?: string | null,
  nowMs: number = Date.now()
): { statusLabel: string; hint: string; expired: boolean } {
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
  const holdDays =
    days != null && days > 0 ? days : PIX_TICKET_HOLD_DAYS;

  const statusLabel = deadline
    ? `Aguardando pagamento · pague até ${deadline}`
    : `Aguardando pagamento · prazo de ${holdDays} dias`;

  const hint = deadline
    ? `Abra o app do banco, escaneie o QR ou cole o código. A vaga fica reservada até ${deadline} (cerca de ${holdDays} dia${holdDays === 1 ? '' : 's'}) — você pode enviar este PIX para outra pessoa pagar. Os ingressos são emitidos automaticamente após a confirmação.`
    : `Abra o app do banco, escaneie o QR ou cole o código. A vaga fica reservada por até ${PIX_TICKET_HOLD_DAYS} dias para pagamento. Os ingressos aparecem aqui após a confirmação.`;

  return { expired: false, statusLabel, hint };
}

/**
 * Formata o restante a partir de `expiresAt`.
 * - ≥ 1 dia: `9d 14h 32m`
 * - ≥ 1 hora: `14:32:05`
 * - < 1 hora: `MM:SS`
 *
 * `maxMinutes` só aplica teto quando a data remanescente for absurda
 * em relação ao teto (ex.: MP ~24h com janela curta de doação).
 */
export function formatPixCountdown(
  expiresAt?: string | null,
  opts?: { maxMinutes?: number; nowMs?: number }
): string {
  const msLeftRaw = pixRemainingMs(expiresAt, opts?.nowMs);
  if (msLeftRaw == null) return '';
  if (msLeftRaw <= 0) return 'Expirado';

  let displayMs = msLeftRaw;
  if (opts?.maxMinutes != null && opts.maxMinutes > 0) {
    const maxMs = opts.maxMinutes * 60 * 1000;
    // Só corta se a data estiver muito além do teto (legado / data do MP).
    if (msLeftRaw > maxMs * 2) {
      displayMs = maxMs;
    } else {
      displayMs = Math.min(msLeftRaw, maxMs);
    }
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
