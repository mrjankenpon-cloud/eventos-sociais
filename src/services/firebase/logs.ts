import { addDoc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { auth } from '../../firebase/auth';
import type { LogCreate, LogEntry, LogChange } from '../../types/log';
import {
  COLLECTIONS,
  col,
  docRef,
  mapDoc,
  stripUndefined,
  timestamps,
  wrapError,
} from './helpers';
import { diffChanges } from './logDiff';

type LogInput = {
  acao: string;
  colecao: string;
  documentoId: string;
  descricao: string;
  usuarioId?: string;
  usuarioNome?: string;
  alteracoes?: LogChange[];
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, string | number | boolean | null>;
};

function resolveActor(input: LogInput): { id: string; nome: string } {
  if (input.usuarioId && input.usuarioNome) {
    return { id: input.usuarioId, nome: input.usuarioNome };
  }
  const user = auth.currentUser;
  return {
    id: input.usuarioId || user?.uid || 'sistema',
    nome: input.usuarioNome || user?.displayName || user?.email || 'Sistema',
  };
}

export const logsService = {
  async create(data: LogInput): Promise<LogEntry> {
    try {
      const actor = resolveActor(data);
      const now = new Date().toISOString();
      const alteracoes =
        data.alteracoes ??
        (data.before || data.after ? diffChanges(data.before, data.after) : undefined);

      const payload: LogCreate = {
        usuarioId: actor.id,
        usuarioNome: actor.nome,
        acao: data.acao,
        colecao: data.colecao,
        documentoId: data.documentoId,
        descricao: data.descricao,
        dataHora: now,
        alteracoes,
        metadata: data.metadata,
        ativo: true,
      };

      const ref = await addDoc(col(COLLECTIONS.logs), {
        ...stripUndefined(payload as unknown as Record<string, unknown>),
        ...timestamps(),
      });

      return {
        id: ref.id,
        usuarioId: payload.usuarioId,
        usuarioNome: payload.usuarioNome,
        acao: payload.acao,
        colecao: payload.colecao,
        documentoId: payload.documentoId,
        descricao: payload.descricao,
        dataHora: payload.dataHora,
        alteracoes: payload.alteracoes,
        metadata: payload.metadata,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      wrapError('logs.create', error);
    }
  },

  /** Registra sem interromper a operação principal */
  async record(data: LogInput): Promise<void> {
    try {
      await this.create(data);
    } catch (error) {
      console.error('[logs.record]', error);
    }
  },

  async getById(id: string): Promise<LogEntry | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.logs, id));
      if (!snap.exists()) return undefined;
      return mapDoc<LogEntry>(snap as Parameters<typeof mapDoc>[0]);
    } catch (error) {
      wrapError('logs.getById', error);
    }
  },

  async getAll(): Promise<LogEntry[]> {
    try {
      const q = query(col(COLLECTIONS.logs), orderBy('createdAt', 'desc'), limit(200));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<LogEntry>(d));
    } catch {
      const snap = await getDocs(col(COLLECTIONS.logs));
      return snap.docs
        .map((d) => mapDoc<LogEntry>(d))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 200);
    }
  },

  async getByColecao(colecao: string): Promise<LogEntry[]> {
    try {
      const q = query(
        col(COLLECTIONS.logs),
        where('colecao', '==', colecao),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<LogEntry>(d));
    } catch {
      const all = await this.getAll();
      return all.filter((l) => l.colecao === colecao);
    }
  },

  async getByDocumento(colecao: string, documentoId: string): Promise<LogEntry[]> {
    try {
      const q = query(
        col(COLLECTIONS.logs),
        where('colecao', '==', colecao),
        where('documentoId', '==', documentoId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<LogEntry>(d));
    } catch {
      const all = await this.getAll();
      return all.filter((l) => l.colecao === colecao && l.documentoId === documentoId);
    }
  },
};
