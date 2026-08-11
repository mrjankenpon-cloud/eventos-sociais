import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import type { Ingresso, IngressoCreate, IngressoUpdate } from '../../types/ingresso';
import type { TicketType } from '../../types/models/event';
import {
  COLLECTIONS,
  col,
  docRef,
  mapDoc,
  stripUndefined,
  timestamps,
  touchUpdated,
  wrapError,
  type PageResult,
  type PaginateOptions,
} from './helpers';
import { ingressoToTicketType, ticketTypeToIngressoPayload } from './mappers';
import { logsService } from './logs';

function ensureDisponivel(data: Partial<Ingresso>): Partial<Ingresso> {
  const quantidade = data.quantidade ?? 0;
  const vendida = data.quantidadeVendida ?? 0;
  return {
    ...data,
    quantidadeDisponivel: Math.max(0, quantidade - vendida),
  };
}

export const ingressosService = {
  async create(data: IngressoCreate): Promise<Ingresso> {
    try {
      const payload = ensureDisponivel({
        ...data,
        quantidadeVendida: data.quantidadeVendida ?? 0,
        quantidadeDisponivel:
          data.quantidadeDisponivel ??
          Math.max(0, data.quantidade - (data.quantidadeVendida ?? 0)),
        limitePorCompra: data.limitePorCompra ?? 10,
        ativo: data.ativo ?? true,
      });

      const ref = await addDoc(col(COLLECTIONS.ingressos), {
        ...stripUndefined(payload as unknown as Record<string, unknown>),
        ...timestamps(),
      });

      const created = await this.getById(ref.id);
      if (!created) throw new Error('Falha ao ler ingresso criado');

      await logsService.record({
        acao: 'create',
        colecao: COLLECTIONS.ingressos,
        documentoId: created.id,
        descricao: `Ingresso criado: ${created.nome}`,
      });

      return created;
    } catch (error) {
      wrapError('ingressos.create', error);
    }
  },

  async getById(id: string): Promise<Ingresso | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.ingressos, id));
      if (!snap.exists()) return undefined;
      return mapDoc<Ingresso>(snap as Parameters<typeof mapDoc>[0]);
    } catch (error) {
      wrapError('ingressos.getById', error);
    }
  },

  async getAll(): Promise<Ingresso[]> {
    try {
      const q = query(col(COLLECTIONS.ingressos), orderBy('nome', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Ingresso>(d));
    } catch {
      const snap = await getDocs(col(COLLECTIONS.ingressos));
      return snap.docs
        .map((d) => mapDoc<Ingresso>(d))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
  },

  async update(id: string, data: IngressoUpdate): Promise<Ingresso> {
    try {
      const current = await this.getById(id);
      if (!current) throw new Error('Ingresso não encontrado');

      const merged = ensureDisponivel({
        quantidade: data.quantidade ?? current.quantidade,
        quantidadeVendida: data.quantidadeVendida ?? current.quantidadeVendida,
        ...data,
      });

      await updateDoc(docRef(COLLECTIONS.ingressos, id), {
        ...stripUndefined(merged as Record<string, unknown>),
        ...touchUpdated(),
      });

      const updated = await this.getById(id);
      if (!updated) throw new Error('Ingresso não encontrado após atualização');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.ingressos,
        documentoId: id,
        descricao: `Ingresso atualizado: ${updated.nome}`,
      });

      return updated;
    } catch (error) {
      wrapError('ingressos.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(docRef(COLLECTIONS.ingressos, id));
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.ingressos,
        documentoId: id,
        descricao: 'Ingresso removido',
      });
    } catch (error) {
      wrapError('ingressos.delete', error);
    }
  },

  async getActive(): Promise<Ingresso[]> {
    try {
      const q = query(
        col(COLLECTIONS.ingressos),
        where('ativo', '==', true),
        orderBy('nome', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Ingresso>(d));
    } catch {
      const all = await this.getAll();
      return all.filter((i) => i.ativo);
    }
  },

  async getByEvento(eventoId: string): Promise<Ingresso[]> {
    try {
      const q = query(
        col(COLLECTIONS.ingressos),
        where('eventoId', '==', eventoId),
        orderBy('nome', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Ingresso>(d));
    } catch {
      try {
        const q2 = query(
          col(COLLECTIONS.ingressos),
          where('eventoId', '==', eventoId)
        );
        const snap2 = await getDocs(q2);
        return snap2.docs
          .map((d) => mapDoc<Ingresso>(d))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      } catch (error) {
        console.warn('[ingressos.getByEvento] falhou', error);
        return [];
      }
    }
  },

  async search(term: string): Promise<Ingresso[]> {
    try {
      const all = await this.getAll();
      const q = term.trim().toLowerCase();
      if (!q) return all;
      return all.filter(
        (i) =>
          i.nome.toLowerCase().includes(q) ||
          i.key.toLowerCase().includes(q) ||
          i.descricao.toLowerCase().includes(q)
      );
    } catch (error) {
      wrapError('ingressos.search', error);
    }
  },

  async paginate(options: PaginateOptions = {}): Promise<PageResult<Ingresso>> {
    try {
      const pageSize = options.pageSize ?? 20;
      const orderField = options.orderField ?? 'nome';
      const orderDir = options.orderDir ?? 'asc';
      const constraints: QueryConstraint[] = [
        orderBy(orderField, orderDir),
        limit(pageSize + 1),
      ];
      const snap = await getDocs(query(col(COLLECTIONS.ingressos), ...constraints));
      const docs = snap.docs.map((d) => mapDoc<Ingresso>(d));
      return {
        items: docs.slice(0, pageSize),
        pageSize,
        hasMore: docs.length > pageSize,
      };
    } catch (error) {
      wrapError('ingressos.paginate', error);
    }
  },

  /** Sincroniza tipos de ingresso do formulário com a coleção ingressos */
  async syncForEvento(eventoId: string, tipos: TicketType[]): Promise<TicketType[]> {
    try {
      const existing = await this.getByEvento(eventoId);
      const existingById = new Map<string, Ingresso>(
        existing.map((i) => [i.id, i])
      );
      const keepIds = new Set(tipos.map((t) => t.id));

      for (const old of existing) {
        if (!keepIds.has(old.id)) {
          await this.delete(old.id);
        }
      }

      const result: TicketType[] = [];

      for (const tipo of tipos) {
        const payload = ticketTypeToIngressoPayload(tipo, eventoId);
        const current = existingById.get(tipo.id);

        if (current) {
          const updated = await this.update(tipo.id, {
            ...payload,
            quantidadeVendida: current.quantidadeVendida,
            quantidadeDisponivel: Math.max(
              0,
              payload.quantidade - current.quantidadeVendida
            ),
          });
          result.push(ingressoToTicketType(updated));
        } else {
          await setDoc(docRef(COLLECTIONS.ingressos, tipo.id), {
            ...stripUndefined(payload as unknown as Record<string, unknown>),
            ...timestamps(),
          });
          const created = await this.getById(tipo.id);
          if (!created) throw new Error('Falha ao sincronizar ingresso');
          result.push(ingressoToTicketType(created));
        }
      }

      return result;
    } catch (error) {
      wrapError('ingressos.syncForEvento', error);
    }
  },

  async asTicketTypes(eventoId: string): Promise<TicketType[]> {
    try {
      const list = await this.getByEvento(eventoId);
      return list.map(ingressoToTicketType);
    } catch (error) {
      wrapError('ingressos.asTicketTypes', error);
    }
  },

  async incrementVendido(ingressoId: string, qty: number): Promise<Ingresso> {
    try {
      const current = await this.getById(ingressoId);
      if (!current) throw new Error('Ingresso não encontrado');
      const vendida = current.quantidadeVendida + qty;
      return this.update(ingressoId, {
        quantidadeVendida: vendida,
        quantidadeDisponivel: Math.max(0, current.quantidade - vendida),
      });
    } catch (error) {
      wrapError('ingressos.incrementVendido', error);
    }
  },
};
