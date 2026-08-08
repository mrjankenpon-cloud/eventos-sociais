import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

function readEnv(name: keyof ImportMetaEnv): string {
  return String(import.meta.env[name] ?? '').trim();
}

/**
 * Config do projeto eventosociais-c057d.
 * Chaves web do Firebase são públicas no cliente; restrições reais vêm de
 * Auth domains + Firestore/Storage rules. Env VITE_* sobrescreve se existir.
 */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD57NyAmfJwJyjwfUqstOcQKinXQCZ_WnE',
  authDomain: 'eventosociais-c057d.firebaseapp.com',
  projectId: 'eventosociais-c057d',
  storageBucket: 'eventosociais-c057d.firebasestorage.app',
  messagingSenderId: '878802346786',
  appId: '1:878802346786:web:1089188a3b4cd893b8bb7b',
} as const;

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY') || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain:
    readEnv('VITE_FIREBASE_AUTH_DOMAIN') || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId:
    readEnv('VITE_FIREBASE_PROJECT_ID') || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket:
    readEnv('VITE_FIREBASE_STORAGE_BUCKET') ||
    DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') ||
    DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: readEnv('VITE_FIREBASE_APP_ID') || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

let analyticsPromise: Promise<Analytics | null> | null = null;

/** Analytics only in the browser when supported (and measurementId is set). */
export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (!firebaseConfig.measurementId) return Promise.resolve(null);
  if (typeof window === 'undefined') return Promise.resolve(null);

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null);
  }

  return analyticsPromise;
}

export { firebaseConfig };
