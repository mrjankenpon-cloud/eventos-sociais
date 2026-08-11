import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { firebaseApp } from './config';

export const auth: Auth = getAuth(firebaseApp);

/** Mantém a sessão no browser até logout explícito. */
void setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('[firebase/auth] setPersistence', error);
});
