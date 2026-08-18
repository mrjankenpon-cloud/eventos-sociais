import { collection, doc, getCountFromServer, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firestore';
import { COLLECTIONS } from './helpers';

const DEVICE_KEY = 'delphos:device-id';

function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing && existing.length >= 16) return existing;
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `d${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return `d${Date.now().toString(16)}`;
  }
}

export const pwaInstallsService = {
  async ping(): Promise<void> {
    const deviceId = getDeviceId();
    const now = new Date().toISOString();
    const ref = doc(db, COLLECTIONS.pwaInstalls, deviceId);
    let createdAt = now;
    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        createdAt = String(existing.data()?.createdAt || now);
      }
    } catch {
      // Sem leitura: grava mesmo assim e preserva createdAt no merge se já existir.
    }
    await setDoc(
      ref,
      {
        deviceId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        updatedAt: now,
        createdAt,
      },
      { merge: true }
    );
  },

  async count(): Promise<number> {
    const snap = await getCountFromServer(
      collection(db, COLLECTIONS.pwaInstalls)
    );
    return snap.data().count;
  },
};
