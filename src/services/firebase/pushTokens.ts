import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firestore';
import { COLLECTIONS } from './helpers';

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export type PushDevice = {
  id: string;
  device: string;
  browser: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
};

function idFromEndpoint(endpoint: string): string {
  let hash = 0;
  for (let i = 0; i < endpoint.length; i += 1) {
    hash = (hash * 31 + endpoint.charCodeAt(i)) | 0;
  }
  return `p${Math.abs(hash).toString(16)}${endpoint.length.toString(16)}`;
}

export function describeUserAgent(ua: string): { device: string; browser: string } {
  const text = ua || '';
  let device = 'Computador';
  if (/Android/i.test(text)) device = 'Android';
  else if (/iPhone|iPad|iPod/i.test(text)) device = 'iPhone/iPad';
  else if (/Windows/i.test(text)) device = 'Windows';
  else if (/Macintosh|Mac OS/i.test(text)) device = 'Mac';
  else if (/Linux/i.test(text)) device = 'Linux';

  let browser = 'Navegador';
  if (/Edg\//i.test(text)) browser = 'Edge';
  else if (/Chrome\//i.test(text) && !/Edg\//i.test(text)) browser = 'Chrome';
  else if (/Safari/i.test(text) && !/Chrome/i.test(text)) browser = 'Safari';
  else if (/Firefox/i.test(text)) browser = 'Firefox';
  else if (/SamsungBrowser/i.test(text)) browser = 'Samsung Internet';

  return { device, browser };
}

export const pushTokensService = {
  async save(subscription: PushSubscriptionPayload): Promise<void> {
    const id = idFromEndpoint(subscription.endpoint);
    const now = new Date().toISOString();
    await setDoc(
      doc(db, COLLECTIONS.pushTokens, id),
      {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  },

  async listDevices(): Promise<PushDevice[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.pushTokens));
    return snap.docs
      .map((d) => {
        const data = d.data() || {};
        const ua = String(data.userAgent || '');
        const { device, browser } = describeUserAgent(ua);
        return {
          id: d.id,
          device,
          browser,
          userAgent: ua,
          createdAt: String(data.createdAt || data.updatedAt || ''),
          updatedAt: String(data.updatedAt || data.createdAt || ''),
        };
      })
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  },
};
