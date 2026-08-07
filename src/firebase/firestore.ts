import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseApp } from './config';

export const db: Firestore = getFirestore(firebaseApp);
