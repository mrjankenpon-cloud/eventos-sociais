import {
  getAuth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { firebaseApp } from './config';

/**
 * Auth com persistência explícita (IndexedDB → localStorage).
 * Evita initializeAuth + array de persistence, que em alguns builds
 * do Firebase 12 dispara auth/argument-error no Google popup.
 */
function createAuth(): Auth {
  const auth = getAuth(firebaseApp);
  void setPersistence(auth, indexedDBLocalPersistence).catch(() =>
    setPersistence(auth, browserLocalPersistence).catch(() => undefined)
  );
  return auth;
}

export const auth: Auth = createAuth();
