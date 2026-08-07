import { doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { ref, listAll } from 'firebase/storage';
import { firebaseApp, firebaseConfig } from '../../firebase/config';
import { auth } from '../../firebase/auth';
import { db } from '../../firebase/firestore';
import { storage } from '../../firebase/storage';
import { COLLECTIONS } from './helpers';

export type HealthStatus = 'ok' | 'warn' | 'error';

export interface HealthItem {
  name: string;
  status: HealthStatus;
  detail: string;
}

export interface HealthReport {
  checkedAt: string;
  projectId: string;
  items: HealthItem[];
  collections: Array<{ name: string; exists: boolean; sampleCount: number }>;
}

async function probeCollection(name: string): Promise<{
  exists: boolean;
  sampleCount: number;
}> {
  try {
    const snap = await getDocs(query(collection(db, name), limit(3)));
    return { exists: true, sampleCount: snap.size };
  } catch (error) {
    console.error(`[health] collection ${name}`, error);
    return { exists: false, sampleCount: 0 };
  }
}

export async function runHealthCheck(): Promise<HealthReport> {
  const items: HealthItem[] = [];
  const projectId = firebaseConfig.projectId || '—';

  items.push({
    name: 'Firebase App',
    status: firebaseApp ? 'ok' : 'error',
    detail: firebaseApp
      ? `Inicializado (${projectId})`
      : 'App não inicializado',
  });

  try {
    await getDoc(doc(db, COLLECTIONS.configuracoes, 'app'));
    items.push({
      name: 'Firestore',
      status: 'ok',
      detail: 'Conectado — leitura em configuracoes/app ok',
    });
  } catch (error) {
    items.push({
      name: 'Firestore',
      status: 'error',
      detail: error instanceof Error ? error.message : 'Falha de conexão',
    });
  }

  try {
    await listAll(ref(storage, 'misc'));
    items.push({
      name: 'Storage',
      status: 'ok',
      detail: 'Conectado — listagem em /misc ok (ou pasta vazia)',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    items.push({
      name: 'Storage',
      status: msg.toLowerCase().includes('permission') ? 'error' : 'warn',
      detail: msg,
    });
  }

  items.push({
    name: 'Authentication',
    status: auth ? 'ok' : 'error',
    detail: auth.currentUser
      ? `Sessão ativa: ${auth.currentUser.email || auth.currentUser.uid}`
      : 'SDK Auth ok — sem sessão (faça login no admin)',
  });

  const firestoreOk = items.find((i) => i.name === 'Firestore')?.status === 'ok';
  items.push({
    name: 'Regras publicadas',
    status: firestoreOk ? 'warn' : 'error',
    detail: firestoreOk
      ? 'Não verificável 100% no client — publique com: firebase deploy --only firestore:rules,storage'
      : 'Firestore inacessível — verifique regras e projeto',
  });

  const collectionNames = Object.values(COLLECTIONS);
  const collections = await Promise.all(
    collectionNames.map(async (name) => {
      const result = await probeCollection(name);
      return { name, ...result };
    })
  );

  return {
    checkedAt: new Date().toISOString(),
    projectId,
    items,
    collections,
  };
}

export const healthService = { runHealthCheck };
