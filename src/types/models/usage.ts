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
  monitoringOk?: boolean;
  monitoringNote?: string;
  overall?: UsageLevel;
  headline?: string;
  details?: string;
}
