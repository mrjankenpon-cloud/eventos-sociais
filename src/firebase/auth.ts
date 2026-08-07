import { getAuth, type Auth } from 'firebase/auth';
import { firebaseApp } from './config';

export const auth: Auth = getAuth(firebaseApp);
