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
import type { Sponsor, SponsorFormData } from '../../types/models/sponsor';
import type { Patrocinador } from '../../types/patrocinador';
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
import { patrocinadorToSponsor } from './mappers';
import { logsService } from './logs';
import { ensureStoredImage, deleteImage } from './storage';

export const patrocinadoresService = {
  async create(data: SponsorFormData): Promise<Sponsor> {
    try {
      const logo = await ensureStoredImage(data.logo, 'patrocinadores', null, 'logo');
      const ref = await addDoc(col(COLLECTIONS.patrocinadores), {
        ...stripUndefined({
          ...data,
          logo,
          ativo: data.ativo ?? true,
        } as unknown as Record<string, unknown>),
        ...timestamps(),
      });
      const created = await this.getById(ref.id);
      if (!created) throw new Error('Falha ao ler patrocinador criado');

      try {
        await logsService.record({
          acao: 'create',
          colecao: COLLECTIONS.patrocinadores,
          documentoId: created.id,
          descricao: `Patrocinador criado: ${created.nome}`,
          after: { nome: created.nome, ativo: created.ativo },
        });
      } catch (logError) {
        console.error('[patrocinadores.create] log', logError);
      }

      return created;
    } catch (error) {
      wrapError('patrocinadores.create', error);
    }
  },

  async getById(id: string): Promise<Sponsor | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.patrocinadores, id));
      if (!snap.exists()) return undefined;
      return patrocinadorToSponsor(mapDoc<Patrocinador>(snap));
    } catch (error) {
      wrapError('patrocinadores.getById', error);
    }
  },

  async getAll(): Promise<Sponsor[]> {
    try {
      const q = query(col(COLLECTIONS.patrocinadores), orderBy('nome', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => patrocinadorToSponsor(mapDoc<Patrocinador>(d)));
    } catch {
      const snap = await getDocs(col(COLLECTIONS.patrocinadores));
      return snap.docs
        .map((d) => patrocinadorToSponsor(mapDoc<Patrocinador>(d)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
  },

  async update(id: string, data: Partial<SponsorFormData>): Promise<Sponsor> {
    try {
      const before = await this.getById(id);
      const patch = { ...data };
      if (typeof data.logo === 'string') {
        patch.logo = await ensureStoredImage(
          data.logo,
          'patrocinadores',
          before?.logo,
          'logo'
        );
      }
      await updateDoc(docRef(COLLECTIONS.patrocinadores, id), {
        ...stripUndefined(patch as Record<string, unknown>),
        ...touchUpdated(),
      });
      const updated = await this.getById(id);
      if (!updated) throw new Error('Patrocinador não encontrado');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.patrocinadores,
        documentoId: id,
        descricao: `Patrocinador atualizado: ${updated.nome}`,
        before: before as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      return updated;
    } catch (error) {
      wrapError('patrocinadores.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const current = await this.getById(id);
      await deleteDoc(docRef(COLLECTIONS.patrocinadores, id));
      if (current?.logo) await deleteImage(current.logo);
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.patrocinadores,
        documentoId: id,
        descricao: 'Patrocinador removido',
      });
    } catch (error) {
      wrapError('patrocinadores.delete', error);
    }
  },

  async getActive(): Promise<Sponsor[]> {
    try {
      const q = query(
        col(COLLECTIONS.patrocinadores),
        where('ativo', '==', true),
        orderBy('nome', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => patrocinadorToSponsor(mapDoc<Patrocinador>(d)));
    } catch {
      const all = await this.getAll();
      return all.filter((s) => s.ativo);
    }
  },

  async search(term: string): Promise<Sponsor[]> {
    try {
      const all = await this.getAll();
      const q = term.trim().toLowerCase();
      if (!q) return all;
      return all.filter((s) => s.nome.toLowerCase().includes(q));
    } catch (error) {
      wrapError('patrocinadores.search', error);
    }
  },

  async paginate(options: PaginateOptions = {}): Promise<PageResult<Sponsor>> {
    try {
      const pageSize = options.pageSize ?? 20;
      const constraints: QueryConstraint[] = [
        orderBy(options.orderField ?? 'nome', options.orderDir ?? 'asc'),
        limit(pageSize + 1),
      ];
      const snap = await getDocs(query(col(COLLECTIONS.patrocinadores), ...constraints));
      const docs = snap.docs.map((d) => patrocinadorToSponsor(mapDoc<Patrocinador>(d)));
      return {
        items: docs.slice(0, pageSize),
        pageSize,
        hasMore: docs.length > pageSize,
      };
    } catch (error) {
      wrapError('patrocinadores.paginate', error);
    }
  },

  async getByIds(ids: string[]): Promise<Sponsor[]> {
    try {
      if (ids.length === 0) return [];
      // getDoc por id (não listar a coleção): anônimos só leem docs com ativo==true.
      const results = await Promise.all(
        [...new Set(ids)].map(async (id) => {
          try {
            const snap = await getDoc(docRef(COLLECTIONS.patrocinadores, id));
            return snap.exists()
              ? patrocinadorToSponsor(mapDoc<Patrocinador>(snap))
              : null;
          } catch {
            return null;
          }
        })
      );
      return results.filter((s): s is Sponsor => Boolean(s));
    } catch (error) {
      wrapError('patrocinadores.getByIds', error);
    }
  },
};
