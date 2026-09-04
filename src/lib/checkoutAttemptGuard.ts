/**
 * Controle local de tentativas de cartão (anti-duplicidade / cooldown).
 * Não substitui o antifraude do MP — só evita martelar o mesmo checkout.
 */

const PREFIX = 'delphos:mp-card-guard:';

export type CardAttemptGuard = {
  count: number;
  /** epoch ms — bloquear cartão até este instante */
  cooldownUntil: number;
  lastDetail?: string;
};

function key(eventoId: string, cpfDigits: string): string {
  return `${PREFIX}${eventoId}:${cpfDigits}`;
}

function read(eventoId: string, cpfDigits: string): CardAttemptGuard | null {
  try {
    const raw = sessionStorage.getItem(key(eventoId, cpfDigits));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CardAttemptGuard;
    if (!parsed || typeof parsed.cooldownUntil !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(eventoId: string, cpfDigits: string, data: CardAttemptGuard) {
  try {
    sessionStorage.setItem(key(eventoId, cpfDigits), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Segundos restantes de cooldown (0 = liberado). */
export function cardCooldownRemainingSec(
  eventoId: string,
  cpfDigits: string
): number {
  const g = read(eventoId, cpfDigits.replace(/\D/g, ''));
  if (!g) return 0;
  const ms = g.cooldownUntil - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

export function getCardAttemptCount(
  eventoId: string,
  cpfDigits: string
): number {
  return read(eventoId, cpfDigits.replace(/\D/g, ''))?.count ?? 0;
}

/**
 * Registra recusa (ex.: high_risk). 1ª → 3 min; 2ª+ → 15 min.
 * Sugere PIX quando count >= 2.
 */
export function recordCardRejection(
  eventoId: string,
  cpfDigits: string,
  statusDetail?: string
): CardAttemptGuard {
  const cpf = cpfDigits.replace(/\D/g, '');
  const prev = read(eventoId, cpf);
  const count = (prev?.count || 0) + 1;
  const cooldownMs = count >= 2 ? 15 * 60 * 1000 : 3 * 60 * 1000;
  const next: CardAttemptGuard = {
    count,
    cooldownUntil: Date.now() + cooldownMs,
    lastDetail: statusDetail || prev?.lastDetail,
  };
  write(eventoId, cpf, next);
  return next;
}

export function shouldPreferPixAfterCardRisk(
  eventoId: string,
  cpfDigits: string
): boolean {
  return getCardAttemptCount(eventoId, cpfDigits) >= 2;
}

export function formatCooldownHint(seconds: number): string {
  if (seconds <= 0) return '';
  const m = Math.ceil(seconds / 60);
  return m <= 1
    ? 'Aguarde cerca de 1 minuto antes de tentar outro cartão.'
    : `Aguarde cerca de ${m} minutos antes de tentar outro cartão.`;
}
