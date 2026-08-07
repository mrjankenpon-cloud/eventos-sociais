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
import type { Banner, BannerFormData } from '../../types/models/banner';
import type { Banner as FsBanner } from '../../types/banner';
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
import { fsBannerToUi, uiBannerToFs } from './mappers';
import { logsService } from './logs';
import { ensureStoredImage, deleteImage } from './storage';

export const bannersService = {
  async create(data: BannerFormData): Promise<Banner> {
    try {
      const imagem = await ensureStoredImage(data.imagem, 'banners');
      const payload = uiBannerToFs({ ...data, imagem });
      const ref = await addDoc(col(COLLECTIONS.banners), {
        ...stripUndefined(payload),
        ...timestamps(),
      });
      const created = await this.getById(ref.id);
      if (!created) throw new Error('Falha ao ler banner criado');

      await logsService.record({
        acao: 'create',
        colecao: COLLECTIONS.banners,
        documentoId: created.id,
        descricao: `Banner criado: ${created.titulo}`,
        after: { titulo: created.titulo },
      });

      return created;
    } catch (error) {
      wrapError('banners.create', error);
    }
  },

  async getById(id: string): Promise<Banner | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.banners, id));
      if (!snap.exists()) return undefined;
      return fsBannerToUi(mapDoc<FsBanner & { eventId?: string; imagem?: string }>(snap));
    } catch (error) {
      wrapError('banners.getById', error);
    }
  },

  async getAll(): Promise<Banner[]> {
    try {
      const q = query(col(COLLECTIONS.banners), orderBy('ordem', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) =>
        fsBannerToUi(mapDoc<FsBanner & { eventId?: string; imagem?: string }>(d))
      );
    } catch {
      const snap = await getDocs(col(COLLECTIONS.banners));
      return snap.docs
        .map((d) =>
          fsBannerToUi(mapDoc<FsBanner & { eventId?: string; imagem?: string }>(d))
        )
        .sort((a, b) => a.ordem - b.ordem);
    }
  },

  async update(id: string, data: Partial<BannerFormData>): Promise<Banner> {
    try {
      const before = await this.getById(id);
      const patch = { ...data };
      if (typeof data.imagem === 'string') {
        patch.imagem = await ensureStoredImage(data.imagem, 'banners', before?.imagem);
      }
      await updateDoc(docRef(COLLECTIONS.banners, id), {
        ...stripUndefined(uiBannerToFs(patch)),
        ...touchUpdated(),
      });
      const updated = await this.getById(id);
      if (!updated) throw new Error('Banner não encontrado');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.banners,
        documentoId: id,
        descricao: `Banner atualizado: ${updated.titulo}`,
        before: before as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      return updated;
    } catch (error) {
      wrapError('banners.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const current = await this.getById(id);
      await deleteDoc(docRef(COLLECTIONS.banners, id));
      if (current?.imagem) await deleteImage(current.imagem);
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.banners,
        documentoId: id,
        descricao: 'Banner removido',
      });
    } catch (error) {
      wrapError('banners.delete', error);
    }
  },

  async getActive(): Promise<Banner[]> {
    try {
      const all = await this.getAll();
      return all.filter((b) => b.ativo);
    } catch (error) {
      wrapError('banners.getActive', error);
    }
  },

  async getByEvento(eventoId: string): Promise<Banner[]> {
    return this.getByEventId(eventoId);
  },

  async getByEventId(eventId: string): Promise<Banner[]> {
    try {
      const q = query(
        col(COLLECTIONS.banners),
        where('eventoId', '==', eventId),
        orderBy('ordem', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) =>
        fsBannerToUi(mapDoc<FsBanner & { eventId?: string; imagem?: string }>(d))
      );
    } catch {
      const all = await this.getAll();
      return all.filter((b) => b.eventId === eventId);
    }
  },

  async search(term: string): Promise<Banner[]> {
    try {
      const all = await this.getAll();
      const q = term.trim().toLowerCase();
      if (!q) return all;
      return all.filter((b) => b.titulo.toLowerCase().includes(q));
    } catch (error) {
      wrapError('banners.search', error);
    }
  },

  async paginate(options: PaginateOptions = {}): Promise<PageResult<Banner>> {
    try {
      const pageSize = options.pageSize ?? 20;
      const constraints: QueryConstraint[] = [
        orderBy(options.orderField ?? 'ordem', options.orderDir ?? 'asc'),
        limit(pageSize + 1),
      ];
      const snap = await getDocs(query(col(COLLECTIONS.banners), ...constraints));
      const docs = snap.docs.map((d) =>
        fsBannerToUi(mapDoc<FsBanner & { eventId?: string; imagem?: string }>(d))
      );
      return {
        items: docs.slice(0, pageSize),
        pageSize,
        hasMore: docs.length > pageSize,
      };
    } catch (error) {
      wrapError('banners.paginate', error);
    }
  },
};
