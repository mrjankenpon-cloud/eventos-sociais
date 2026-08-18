import { VAPID_PUBLIC_KEY } from './pushVapid';
import { pushTokensService } from '../services/firebase/pushTokens';
import { isPwaInstalled } from '../hooks/usePwaInstall';

function vapidToBytes(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function canUseWebPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!canUseWebPush()) return null;
  const ready = await navigator.serviceWorker.ready;
  if (ready) return ready;
  return navigator.serviceWorker.register('/sw.js');
}

/** Grava a inscrição se o app estiver instalado e a permissão já tiver sido dada. */
export async function syncInstalledPushSubscription(): Promise<boolean> {
  if (!isPwaInstalled() || !canUseWebPush()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await getPushRegistration();
    if (!registration) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidToBytes(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    await pushTokensService.save({
      endpoint: json.endpoint,
      expirationTime: json.expirationTime ?? null,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    return true;
  } catch (error) {
    console.warn('[push] não foi possível registrar avisos', error);
    return false;
  }
}

/** Pede permissão (precisa de toque do usuário, principalmente no iOS). */
export async function enableInstalledAppPush(): Promise<boolean> {
  if (!isPwaInstalled() || !canUseWebPush()) return false;
  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (permission !== 'granted') return false;
  return syncInstalledPushSubscription();
}
