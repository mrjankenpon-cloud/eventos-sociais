import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firestore';
import { COLLECTIONS } from './helpers';
import { auth } from '../../firebase/auth';
import { firebaseConfig } from '../../firebase/config';
import type { UsageLive } from '../../types/models/usage';

const LIVE_ID = 'live';

export function subscribeUsageLive(
  onChange: (data: UsageLive | null) => void
): () => void {
  return onSnapshot(
    doc(db, COLLECTIONS.usageStats, LIVE_ID),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as UsageLive) : null);
    },
    (error) => {
      console.error('[usageStats]', error);
      onChange(null);
    }
  );
}

function functionsBaseUrl(): string {
  const override = String(import.meta.env.VITE_FUNCTIONS_URL || '').trim();
  if (override) return override.replace(/\/$/, '');
  const region =
    String(import.meta.env.VITE_FUNCTIONS_REGION || '').trim() || 'us-central1';
  const project = firebaseConfig.projectId || 'eventosociais-c057d';
  return `https://${region}-${project}.cloudfunctions.net`;
}

export async function refreshUsageSnapshot(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login.');
  const token = await user.getIdToken();
  const res = await fetch(`${functionsBaseUrl()}/collectUsageSnapshotHttp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: '{}',
  });
  if (!res.ok) {
    throw new Error('Não foi possível atualizar as métricas agora.');
  }
}

export const usageStatsService = {
  subscribeUsageLive,
  refreshUsageSnapshot,
};
