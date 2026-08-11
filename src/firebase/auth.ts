import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { firebaseApp } from './config';

/**
 * Persistência local (IndexedDB → localStorage) na inicialização,
 * antes de qualquer listener — sessão sobrevive a navegação e reload
 * até logout explícito.
 */
function createAuth(): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    // HMR / reimport: Auth já inicializado
    return getAuth(firebaseApp);
  }
}

export const auth: Auth = createAuth();
