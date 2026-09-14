/** Contagem regressiva do QR PIX (janela do site, não a expiração longa do MP). */

export const PIX_COUNTDOWN_MINUTES = 15;

export function pixRemainingMs(
  expiresAt?: string | null,
  nowMs: number = Date.now()
): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  return end - nowMs;
}

/**
 * Formata restante como MM:SS.
 * Se a data vier absurda (ex.: expiração ~24h do MP), limita ao teto de 15 min.
 */
export function formatPixCountdown(
  expiresAt?: string | null,
  opts?: { maxMinutes?: number; nowMs?: number }
): string {
  const maxMinutes = opts?.maxMinutes ?? PIX_COUNTDOWN_MINUTES;
  const msLeft = pixRemainingMs(expiresAt, opts?.nowMs);
  if (msLeft == null) return '';
  if (msLeft <= 0) return 'Expirado';

  const maxMs = Math.max(1, maxMinutes) * 60 * 1000;
  // Datas do MP costumam vir com ~24h; o site promete janela curta de reserva.
  const displayMs = msLeft > maxMs * 2 ? maxMs : Math.min(msLeft, maxMs);
  const min = Math.floor(displayMs / 60000);
  const sec = Math.floor((displayMs % 60000) / 1000);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
