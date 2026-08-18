import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firestore';
import { COLLECTIONS } from './helpers';

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

function idFromEndpoint(endpoint: string): string {
  let hash = 0;
  for (let i = 0; i < endpoint.length; i += 1) {
    hash = (hash * 31 + endpoint.charCodeAt(i)) | 0;
  }
  return `p${Math.abs(hash).toString(16)}${endpoint.length.toString(16)}`;
}

export const pushTokensService = {
  async save(subscription: PushSubscriptionPayload): Promise<void> {
    const id = idFromEndpoint(subscription.endpoint);
    await setDoc(doc(db, COLLECTIONS.pushTokens, id), {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }, { merge: true });
  },
};
