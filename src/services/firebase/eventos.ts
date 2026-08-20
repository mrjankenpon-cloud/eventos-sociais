import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import type { Event, EventFormData } from '../../types/models/event';
import type { Evento } from '../../types/evento';
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
import { eventFormToEventoPayload, eventoToUiEvent } from './mappers';
import { ingressosService } from './ingressos';
import { logsService } from './logs';
import { persistEventMedia } from './media';
import { invalidatePublicQuery } from '../../lib/publicDataCache';

const PUBLIC_EVENTS_CACHE_KEY = 'events.published';

function bustPublicEventsCache(): void {
  invalidatePublicQuery(PUBLIC_EVENTS_CACHE_KEY);
}
import { deleteImage } from './storage';
import { pedidosService } from './pedidos';
import { checkinsService } from './checkins';

async function hydrateEvent(raw: Evento & Record<string, unknown>): Promise<Event> {
  const tipos = await ingressosService.asTicketTypes(raw.id);
  // Fallback: tipos embutidos em docs legados
  if (tipos.length === 0 && Array.isArray(raw.tiposIngresso)) {
    return eventoToUiEvent(raw, raw.tiposIngresso as Event['tiposIngresso']);
  }
  return eventoToUiEvent(raw, tipos);
}

function eventFromRaw(
  raw: Evento & Record<string, unknown>,
  tipos: Event['tiposIngresso']
): Event {
  if ((!tipos || tipos.length === 0) && Array.isArray(raw.tiposIngresso)) {
    return eventoToUiEvent(raw, raw.tiposIngresso as Event['tiposIngresso']);
  }
  return eventoToUiEvent(raw, tipos);
}

async function hydrateEvents(
  raws: Array<Evento & Record<string, unknown>>
): Promise<Event[]> {
  const tiposMap = await ingressosService.asTicketTypesByEventos(
    raws.map((raw) => raw.id)
  );
  return raws.map((raw) => eventFromRaw(raw, tiposMap.get(raw.id) || []));
}

async function recalcQuantidadeRestante(eventoId: string): Promise<{
  restante: number;
  vendidas: number;
}> {
  const snap = await getDoc(docRef(COLLECTIONS.eventos, eventoId));
  const raw = snap.exists() ? snap.data() || {} : {};
  const vagas = Number(raw.quantidadeMaxima) || 0;
  const vendidas = Math.max(0, Number(raw.vagasVendidasCompetindo) || 0);
  return {
    restante: Math.max(0, vagas - vendidas),
    vendidas,
  };
}

export const eventosService = {
  async create(data: EventFormData): Promise<Event> {
    try {
      const { tiposIngresso, ...rest } = data;
      const withMedia = await persistEventMedia(rest);
      const payload = eventFormToEventoPayload(withMedia as EventFormData);
      const ref = await addDoc(col(COLLECTIONS.eventos), {
        ...stripUndefined(payload),
        ...timestamps(),
      });

      if (tiposIngresso?.length) {
        await ingressosService.syncForEvento(ref.id, tiposIngresso);
        const { restante, vendidas } = await recalcQuantidadeRestante(ref.id);
        await updateDoc(docRef(COLLECTIONS.eventos, ref.id), {
          quantidadeRestante: restante,
          vagasVendidasCompetindo: vendidas,
          ...touchUpdated(),
        });
      }

      const created = await this.getById(ref.id);
      if (!created) throw new Error('Falha ao ler evento criado');

      await logsService.record({
        acao: 'create',
        colecao: COLLECTIONS.eventos,
        documentoId: created.id,
        descricao: `Evento criado: ${created.titulo}`,
        after: { titulo: created.titulo, status: created.publicado ? 'publicado' : 'rascunho' },
      });

      bustPublicEventsCache();
      return created;
    } catch (error) {
      wrapError('eventos.create', error);
    }
  },

  async getById(id: string): Promise<Event | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.eventos, id));
      if (!snap.exists()) return undefined;
      const raw = mapDoc<Evento & Record<string, unknown>>(
        snap as Parameters<typeof mapDoc>[0]
      );
      return hydrateEvent(raw);
    } catch (error) {
      wrapError('eventos.getById', error);
    }
  },

  async getAll(): Promise<Event[]> {
    try {
      const q = query(col(COLLECTIONS.eventos), orderBy('data', 'asc'));
      const snap = await getDocs(q);
      const list = await Promise.all(
        snap.docs.map((d) =>
          hydrateEvent(mapDoc<Evento & Record<string, unknown>>(d))
        )
      );
      return list;
    } catch {
      try {
        const snap = await getDocs(col(COLLECTIONS.eventos));
        const list = await Promise.all(
          snap.docs.map((d) =>
            hydrateEvent(mapDoc<Evento & Record<string, unknown>>(d))
          )
        );
        return list.sort((a, b) => a.data.localeCompare(b.data));
      } catch (inner) {
        wrapError('eventos.getAll', inner);
      }
    }
  },

  async update(id: string, data: Partial<EventFormData>): Promise<Event> {
    try {
      const current = await this.getById(id);
      if (!current) throw new Error('Evento não encontrado');

      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = current;
      const merged = { ...rest, ...data } as EventFormData;
      const { tiposIngresso, ...formRest } = merged;
      const withMedia = await persistEventMedia(formRest, current);
      const payload = eventFormToEventoPayload(withMedia as EventFormData);

      await updateDoc(docRef(COLLECTIONS.eventos, id), {
        ...stripUndefined(payload),
        ...touchUpdated(),
      });

      if (tiposIngresso) {
        await ingressosService.syncForEvento(id, tiposIngresso);
      }

      const { restante, vendidas } = await recalcQuantidadeRestante(id);
      await updateDoc(docRef(COLLECTIONS.eventos, id), {
        quantidadeRestante: restante,
        vagasVendidasCompetindo: vendidas,
        ...touchUpdated(),
      });

      const updated = await this.getById(id);
      if (!updated) throw new Error('Evento não encontrado após atualização');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.eventos,
        documentoId: id,
        descricao: `Evento atualizado: ${updated.titulo}`,
        before: { titulo: current.titulo, publicado: current.publicado },
        after: { titulo: updated.titulo, publicado: updated.publicado },
      });

      bustPublicEventsCache();
      return updated;
    } catch (error) {
      wrapError('eventos.update', error);
    }
  },

  /**
   * Soft-delete: arquiva o evento preservando ingressos, pedidos,
   * pagamentos, tickets e histórico financeiro.
   */
  async delete(id: string): Promise<void> {
    try {
      const current = await this.getById(id);
      if (!current) throw new Error('Evento não encontrado');

      await updateDoc(docRef(COLLECTIONS.eventos, id), {
        status: 'arquivado',
        arquivado: true,
        arquivadoEm: new Date().toISOString(),
        publicado: false,
        ...touchUpdated(),
      });

      await logsService.record({
        acao: 'archive',
        colecao: COLLECTIONS.eventos,
        documentoId: id,
        descricao: `Evento arquivado: ${current.titulo}`,
        before: { status: current.status, publicado: current.publicado },
        after: { status: 'arquivado', publicado: false },
      });

      bustPublicEventsCache();
    } catch (error) {
      wrapError('eventos.delete', error);
    }
  },

  /** Hard delete — somente uso excepcional (admin); não remove pedidos. */
  async hardDelete(id: string): Promise<void> {
    try {
      const current = await this.getById(id);
      await deleteDoc(docRef(COLLECTIONS.eventos, id));
      if (current?.banner) await deleteImage(current.banner);
      for (const img of current?.imagens ?? []) {
        if (img.url) await deleteImage(img.url);
      }
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.eventos,
        documentoId: id,
        descricao: 'Evento removido permanentemente (hard delete)',
      });
      bustPublicEventsCache();
    } catch (error) {
      wrapError('eventos.hardDelete', error);
    }
  },

  /**
   * Apaga relatório (pedidos/tickets/check-ins/tipos) e o evento permanentemente.
   */
  async purgeWithReport(id: string): Promise<void> {
    try {
      const current = await this.getById(id);
      await pedidosService.deleteByEventId(id);
      await checkinsService.deleteByEvento(id);
      const tipos = await ingressosService.getByEvento(id);
      await Promise.all(tipos.map((t) => ingressosService.delete(t.id)));
      await this.hardDelete(id);
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.eventos,
        documentoId: id,
        descricao: `Evento e relatório apagados: ${current?.titulo || id}`,
      });
    } catch (error) {
      wrapError('eventos.purgeWithReport', error);
    }
  },

  async getActive(): Promise<Event[]> {
    try {
      const all = await this.getAll();
      return all.filter((e) => e.publicado);
    } catch (error) {
      wrapError('eventos.getActive', error);
    }
  },

  async getPublished(): Promise<Event[]> {
    try {
      // Sem orderBy no servidor: evita índice composto obrigatório (status+data).
      // Ordenação fica no cliente.
      const q = query(
        col(COLLECTIONS.eventos),
        where('status', '==', 'publicado')
      );
      const snap = await getDocs(q);
      const list = await hydrateEvents(
        snap.docs.map((d) => mapDoc<Evento & Record<string, unknown>>(d))
      );
      return list.sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
    } catch (primaryError) {
      console.warn(
        '[eventos.getPublished] query status falhou, tentando publicado==true',
        primaryError
      );
      try {
        const q2 = query(
          col(COLLECTIONS.eventos),
          where('publicado', '==', true)
        );
        const snap2 = await getDocs(q2);
        const list = await hydrateEvents(
          snap2.docs
            .map((d) => mapDoc<Evento & Record<string, unknown>>(d))
            .filter((e) => e.status !== 'arquivado' && !Boolean(e.arquivado))
        );
        return list.sort((a, b) =>
          String(a.data || '').localeCompare(String(b.data || ''))
        );
      } catch (fallbackError) {
        console.error('[eventos.getPublished] fallback falhou', fallbackError);
        return [];
      }
    }
  },

  async getFeatured(): Promise<Event[]> {
    try {
      const published = await this.getPublished();
      return published.filter((e) => e.eventoDestaque);
    } catch (error) {
      wrapError('eventos.getFeatured', error);
    }
  },

  async search(term: string): Promise<Event[]> {
    try {
      const all = await this.getAll();
      const q = term.trim().toLowerCase();
      if (!q) return all;
      return all.filter(
        (e) =>
          e.titulo.toLowerCase().includes(q) ||
          e.descricaoCurta.toLowerCase().includes(q) ||
          e.cidade.toLowerCase().includes(q)
      );
    } catch (error) {
      wrapError('eventos.search', error);
    }
  },

  async paginate(options: PaginateOptions = {}): Promise<PageResult<Event>> {
    try {
      const pageSize = options.pageSize ?? 20;
      const constraints: QueryConstraint[] = [
        orderBy(options.orderField ?? 'data', options.orderDir ?? 'asc'),
        limit(pageSize + 1),
      ];
      const snap = await getDocs(query(col(COLLECTIONS.eventos), ...constraints));
      const items = await Promise.all(
        snap.docs.map((d) =>
          hydrateEvent(mapDoc<Evento & Record<string, unknown>>(d))
        )
      );
      return {
        items: items.slice(0, pageSize),
        pageSize,
        hasMore: items.length > pageSize,
      };
    } catch (error) {
      wrapError('eventos.paginate', error);
    }
  },

  async countBySponsor(sponsorId: string): Promise<number> {
    try {
      const events = await this.getAll();
      return events.filter((e) =>
        e.patrocinadoresVinculados.some((l) => l.id === sponsorId)
      ).length;
    } catch (error) {
      wrapError('eventos.countBySponsor', error);
    }
  },

  async countByInstitution(institutionId: string): Promise<number> {
    try {
      const events = await this.getAll();
      return events.filter((e) =>
        e.instituicoesVinculadas.some((l) => l.id === institutionId)
      ).length;
    } catch (error) {
      wrapError('eventos.countByInstitution', error);
    }
  },

  async unlinkSponsor(sponsorId: string): Promise<void> {
    try {
      const events = await this.getAll();
      await Promise.all(
        events
          .filter((e) => e.patrocinadoresVinculados.some((l) => l.id === sponsorId))
          .map((e) =>
            this.update(e.id, {
              patrocinadoresVinculados: e.patrocinadoresVinculados.filter(
                (l) => l.id !== sponsorId
              ),
            })
          )
      );
    } catch (error) {
      wrapError('eventos.unlinkSponsor', error);
    }
  },

  async unlinkInstitution(institutionId: string): Promise<void> {
    try {
      const events = await this.getAll();
      await Promise.all(
        events
          .filter((e) => e.instituicoesVinculadas.some((l) => l.id === institutionId))
          .map((e) =>
            this.update(e.id, {
              instituicoesVinculadas: e.instituicoesVinculadas.filter(
                (l) => l.id !== institutionId
              ),
            })
          )
      );
    } catch (error) {
      wrapError('eventos.unlinkInstitution', error);
    }
  },
};
