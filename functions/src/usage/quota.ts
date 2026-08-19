import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';

export const USAGE_LIVE_ID = 'live';
export const USAGE_COLLECTION = 'usageStats';

/** Faixa gratuita diária (Spark e Blaze sem custo extra). Dia: meia-noite no Pacífico. */
export const FREE_DAILY = {
  reads: 50_000,
  writes: 20_000,
  deletes: 20_000,
} as const;

export type UsageLevel = 'ok' | 'watch' | 'hot';

export function quotaDayId(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function startOfQuotaDayIso(now = new Date()): string {
  const day = quotaDayId(now);
  for (const offset of ['-07:00', '-08:00'] as const) {
    const candidate = new Date(`${day}T00:00:00${offset}`);
    if (
      quotaDayId(candidate) === day &&
      quotaDayId(new Date(candidate.getTime() - 1000)) !== day
    ) {
      return candidate.toISOString();
    }
  }
  return `${day}T00:00:00-08:00`;
}

export function levelFromPct(pct: number): UsageLevel {
  if (pct >= 80) return 'hot';
  if (pct >= 50) return 'watch';
  return 'ok';
}

export function worstLevel(a: UsageLevel, b: UsageLevel): UsageLevel {
  const rank = { ok: 0, watch: 1, hot: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export function pctOf(used: number | null, cap: number): number {
  if (used == null || used < 0) return 0;
  return Math.min(999, Math.round((used / cap) * 1000) / 10);
}

export function liveRef() {
  return admin.firestore().collection(USAGE_COLLECTION).doc(USAGE_LIVE_ID);
}
