import { firebaseConfig } from '../firebase/config';
import { auth } from '../firebase/auth';

const PROJECT_ID = firebaseConfig.projectId || 'eventosociais-c057d';
const REGION =
  String(import.meta.env.VITE_FUNCTIONS_REGION || '').trim() || 'us-central1';

function functionsBaseUrl(): string {
  const override = String(import.meta.env.VITE_FUNCTIONS_URL || '').trim();
  if (override) return override.replace(/\/$/, '');
  return `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;
}

/** Envia pedido de acesso (conta Google já autenticada, ainda sem permissão). */
export async function submitPanelAccessRequest(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  const res = await fetch(`${functionsBaseUrl()}/requestPanelAccess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: '{}',
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok && res.status !== 400) {
    throw new Error(data.error || 'Não foi possível enviar o pedido de acesso.');
  }
  if (!res.ok && data.error) {
    throw new Error(data.error);
  }
}
