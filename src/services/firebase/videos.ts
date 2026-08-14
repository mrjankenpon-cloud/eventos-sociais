import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import type { SiteVideo, SiteVideoFormData } from '../../types/models/siteVideo';
import {
  COLLECTIONS,
  col,
  docRef,
  mapDoc,
  stripUndefined,
  timestamps,
  touchUpdated,
  wrapError,
} from './helpers';
import { logsService } from './logs';

function toVideo(raw: SiteVideo): SiteVideo {
  return {
    id: raw.id,
    titulo: raw.titulo ?? '',
    url: raw.url ?? '',
    thumbnailUrl: raw.thumbnailUrl || undefined,
    ordem: typeof raw.ordem === 'number' ? raw.ordem : 0,
    ativo: raw.ativo !== false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const videosService = {
  async create(data: SiteVideoFormData): Promise<SiteVideo> {
    try {
      const ref = await addDoc(col(COLLECTIONS.videos), {
        ...stripUndefined({
          titulo: data.titulo.trim(),
          url: data.url.trim(),
          thumbnailUrl: data.thumbnailUrl?.trim() || null,
          ordem: data.ordem ?? 0,
          ativo: data.ativo !== false,
        }),
        ...timestamps(),
      });
      const created = await this.getById(ref.id);
      if (!created) throw new Error('Falha ao ler vídeo criado');

      try {
        await logsService.record({
          acao: 'create',
          colecao: COLLECTIONS.videos,
          documentoId: created.id,
          descricao: `Vídeo criado: ${created.titulo}`,
          after: { titulo: created.titulo, ativo: created.ativo },
        });
      } catch (logError) {
        console.error('[videos.create] log', logError);
      }

      return created;
    } catch (error) {
      wrapError('videos.create', error);
    }
  },

  async getById(id: string): Promise<SiteVideo | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.videos, id));
      if (!snap.exists()) return undefined;
      return toVideo(mapDoc<SiteVideo>(snap));
    } catch (error) {
      wrapError('videos.getById', error);
    }
  },

  async getAll(): Promise<SiteVideo[]> {
    try {
      const q = query(col(COLLECTIONS.videos), orderBy('ordem', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => toVideo(mapDoc<SiteVideo>(d)));
    } catch {
      const snap = await getDocs(col(COLLECTIONS.videos));
      return snap.docs
        .map((d) => toVideo(mapDoc<SiteVideo>(d)))
        .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR'));
    }
  },

  async getActive(): Promise<SiteVideo[]> {
    const all = await this.getAll();
    return all.filter((v) => v.ativo);
  },

  async update(id: string, data: Partial<SiteVideoFormData>): Promise<SiteVideo> {
    try {
      const before = await this.getById(id);
      const patch: Record<string, unknown> = { ...touchUpdated() };
      if (typeof data.titulo === 'string') patch.titulo = data.titulo.trim();
      if (typeof data.url === 'string') patch.url = data.url.trim();
      if (data.thumbnailUrl !== undefined) {
        patch.thumbnailUrl = data.thumbnailUrl.trim() || null;
      }
      if (typeof data.ordem === 'number') patch.ordem = data.ordem;
      if (typeof data.ativo === 'boolean') patch.ativo = data.ativo;

      await updateDoc(docRef(COLLECTIONS.videos, id), stripUndefined(patch));
      const updated = await this.getById(id);
      if (!updated) throw new Error('Vídeo não encontrado após atualização');

      try {
        await logsService.record({
          acao: 'update',
          colecao: COLLECTIONS.videos,
          documentoId: id,
          descricao: `Vídeo atualizado: ${updated.titulo}`,
          before: before
            ? { titulo: before.titulo, ativo: before.ativo, ordem: before.ordem }
            : undefined,
          after: { titulo: updated.titulo, ativo: updated.ativo, ordem: updated.ordem },
        });
      } catch (logError) {
        console.error('[videos.update] log', logError);
      }

      return updated;
    } catch (error) {
      wrapError('videos.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const before = await this.getById(id);
      await deleteDoc(docRef(COLLECTIONS.videos, id));
      try {
        await logsService.record({
          acao: 'delete',
          colecao: COLLECTIONS.videos,
          documentoId: id,
          descricao: `Vídeo removido: ${before?.titulo ?? id}`,
          before: before
            ? { titulo: before.titulo, url: before.url }
            : undefined,
        });
      } catch (logError) {
        console.error('[videos.delete] log', logError);
      }
    } catch (error) {
      wrapError('videos.delete', error);
    }
  },
};
