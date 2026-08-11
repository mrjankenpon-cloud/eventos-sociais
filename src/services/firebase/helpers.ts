import {
  collection,
  doc,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firestore';

export const COLLECTIONS = {
  usuarios: 'usuarios',
  eventos: 'eventos',
  banners: 'banners',
  patrocinadores: 'patrocinadores',
  instituicoes: 'instituicoes',
  /** Banco de imagens (logos, banners) — usado quando Storage não está disponível */
  imagens: 'imagens',
  ingressos: 'ingressos',
  pedidos: 'pedidos',
  /** Tickets emitidos (QR / check-in) — derivados de pedidos */
  tickets: 'tickets',
  checkins: 'checkins',
  configuracoes: 'configuracoes',
  logs: 'logs',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export function col(name: CollectionName) {
  return collection(db, name);
}

export function docRef(name: CollectionName, id: string) {
  return doc(db, name, id);
}

export function timestamps() {
  return {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function touchUpdated() {
  return { updatedAt: serverTimestamp() };
}

export function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  const ts = value as Timestamp;
  if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
  return new Date().toISOString();
}

export function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

/** Maps Firestore doc → domain object with ISO date strings + id */
export function mapDoc<T extends { id: string }>(snap: {
  id: string;
  data: () => DocumentData | undefined;
}): T {
  const raw = snap.data();
  if (!raw) {
    throw new Error('Documento sem dados');
  }
  const { createdAt, updatedAt, ...rest } = raw;
  return {
    id: snap.id,
    ...rest,
    createdAt: toIso(createdAt),
    updatedAt: toIso(updatedAt ?? createdAt),
  } as unknown as T;
}

export function wrapError(context: string, error: unknown): never {
  console.error(`[${context}]`, error);
  if (error instanceof Error && error.message && !error.message.startsWith('[')) {
    throw new Error(`[${context}] ${error.message}`);
  }
  throw new Error(
    `[${context}] ${error instanceof Error ? error.message : 'Operação falhou.'}`
  );
}

export function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T): DocumentData {
      const { id: _id, ...data } = model;
      return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options);
      return mapDoc<T>({ id: snapshot.id, data: () => data });
    },
  };
}

export interface PaginateOptions {
  pageSize?: number;
  orderField?: string;
  orderDir?: 'asc' | 'desc';
}

export interface PageResult<T> {
  items: T[];
  pageSize: number;
  hasMore: boolean;
}
