import type { User } from '../types/models/user';

/** Sem heartbeat neste intervalo, a sessão deixa de contar como online. */
export const PRESENCE_TTL_MS = 2 * 60 * 1000;
export const PRESENCE_HEARTBEAT_MS = 45 * 1000;

export function isStaffOnline(user: User, now = Date.now()): boolean {
  if (user.pending) return false;
  if (user.ativo === false) return false;
  if (user.presenceActive === false) return false;
  const seen = Date.parse(String(user.lastSeenAt || ''));
  if (Number.isNaN(seen)) return false;
  return now - seen <= PRESENCE_TTL_MS;
}

export function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
