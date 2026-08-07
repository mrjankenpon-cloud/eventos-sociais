import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

function readEnv(name: keyof ImportMetaEnv): string {
  return String(import.meta.env[name] ?? '').trim();
}

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY') || 'demo-api-key',
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'demo.firebaseapp.com',
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID') || 'demo-project',
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'demo.appspot.com',
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '0',
  appId: readEnv('VITE_FIREBASE_APP_ID') || 'demo-app',
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
};

if (!readEnv('VITE_FIREBASE_API_KEY') && import.meta.env.DEV) {
  console.warn(
    '[Firebase] Variáveis VITE_FIREBASE_* ausentes. Configure .env.local com as credenciais do projeto.'
  );
}

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
