export type UsageLevel = 'ok' | 'watch' | 'hot';

export interface UsageLive {
  quotaDay?: string;
  updatedAt?: string;
  lastVisitAt?: string;
  siteSessionsToday?: number;
  firestoreReadsToday?: number | null;
  firestoreWritesToday?: number | null;
  firestoreDeletesToday?: number | null;
  functionsExecToday?: number | null;
  readsPct?: number;
  writesPct?: number;
  deletesPct?: number;
  /** Usados na janela móvel de 24h (alias histórico). */
  emailsToday?: number | null;
  /** Envios no mês civil atual (UTC), 1º dia 00:00Z até agora. */
  emailsMonth?: number | null;
  /**
   * Header x-resend-monthly-quota (referência da cota Resend).
   * Pode diferir da contagem civil; não exibir sozinho como "este mês".
   */
  emailsQuotaHeaderMonth?: number | null;
  emailsDayPct?: number;
  emailsMonthPct?: number;
  emailsUpdatedAt?: string;
  /** Usados nas últimas 24h (janela móvel Resend). */
  emailsWindowUsed?: number | null;
  emailsWindowRemaining?: number | null;
  /** Quando o envio mais antigo da janela libera a vaga de novo. */
  emailsNextReleaseAt?: string | null;
  emailsNextReleaseCount?: number | null;
  monitoringOk?: boolean;
  monitoringNote?: string;
  overall?: UsageLevel;
  headline?: string;
  details?: string;
}
