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
import type { Institution, InstitutionFormData } from '../../types/models/institution';
import type { Instituicao } from '../../types/instituicao';
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
import { instituicaoToInstitution, institutionFormToFs } from './mappers';
import { logsService } from './logs';
import { ensureStoredImage, deleteImage } from './storage';

export const instituicoesService = {
  async create(data: InstitutionFormData): Promise<Institution> {
    try {
      const logo = await ensureStoredImage(data.logo, 'instituicoes');
      const imagemDestaque = data.imagemDestaque
        ? await ensureStoredImage(data.imagemDestaque, 'instituicoes')
        : data.imagemDestaque;
      const payload = institutionFormToFs({ ...data, logo, imagemDestaque });
      const ref = await addDoc(col(COLLECTIONS.instituicoes), {
        ...stripUndefined(payload),
        ...timestamps(),
      });
      const created = await this.getById(ref.id);
      if (!created) throw new Error('Falha ao ler instituição criada');

      await logsService.record({
        acao: 'create',
        colecao: COLLECTIONS.instituicoes,
        documentoId: created.id,
        descricao: `Instituição criada: ${created.nome}`,
        after: { nome: created.nome },
      });

      return created;
    } catch (error) {
      wrapError('instituicoes.create', error);
    }
  },

  async getById(id: string): Promise<Institution | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.instituicoes, id));
      if (!snap.exists()) return undefined;
      const raw = mapDoc<Instituicao & { descricaoCurta?: string; chavePix?: string }>(
        snap
      );
      // Compat docs antigos já no formato UI
      if (raw.descricaoCurta !== undefined && !raw.descricao) {
        return {
          id: raw.id,
          nome: raw.nome,
          logo: raw.logo,
          imagemDestaque: raw.imagemDestaque,
          descricaoCurta: raw.descricaoCurta,
          historia: raw.historia ?? '',
          site: raw.site,
          instagram: raw.instagram,
          facebook: raw.facebook,
          email: raw.email,
          telefone: raw.telefone,
          endereco: raw.endereco,
          cidade: raw.cidade,
          estado: raw.estado,
          chavePix: raw.chavePix ?? raw.pix,
          ativo: raw.ativo,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        };
      }
      return instituicaoToInstitution(raw);
    } catch (error) {
      wrapError('instituicoes.getById', error);
    }
  },

  async getAll(): Promise<Institution[]> {
    try {
      const q = query(col(COLLECTIONS.instituicoes), orderBy('nome', 'asc'));
      const snap = await getDocs(q);
      const list = await Promise.all(snap.docs.map((d) => this.getById(d.id)));
      return list.filter(Boolean) as Institution[];
    } catch {
      const snap = await getDocs(col(COLLECTIONS.instituicoes));
      const list = await Promise.all(snap.docs.map((d) => this.getById(d.id)));
      return (list.filter(Boolean) as Institution[]).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      );
    }
  },

  async update(id: string, data: Partial<InstitutionFormData>): Promise<Institution> {
    try {
      const before = await this.getById(id);
      const patch = { ...data };
      if (typeof data.logo === 'string') {
        patch.logo = await ensureStoredImage(data.logo, 'instituicoes', before?.logo);
      }
      if (typeof data.imagemDestaque === 'string') {
        patch.imagemDestaque = await ensureStoredImage(
          data.imagemDestaque,
          'instituicoes',
          before?.imagemDestaque
        );
      }
      await updateDoc(docRef(COLLECTIONS.instituicoes, id), {
        ...stripUndefined(institutionFormToFs(patch)),
        ...touchUpdated(),
      });
      const updated = await this.getById(id);
      if (!updated) throw new Error('Instituição não encontrada');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.instituicoes,
        documentoId: id,
        descricao: `Instituição atualizada: ${updated.nome}`,
        before: before as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      return updated;
    } catch (error) {
      wrapError('instituicoes.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const current = await this.getById(id);
      await deleteDoc(docRef(COLLECTIONS.instituicoes, id));
      if (current?.logo) await deleteImage(current.logo);
      if (current?.imagemDestaque) await deleteImage(current.imagemDestaque);
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.instituicoes,
        documentoId: id,
        descricao: 'Instituição removida',
      });
    } catch (error) {
      wrapError('instituicoes.delete', error);
    }
  },

  async getActive(): Promise<Institution[]> {
    try {
      const all = await this.getAll();
      return all.filter((i) => i.ativo);
    } catch (error) {
      wrapError('instituicoes.getActive', error);
    }
  },

  async search(term: string): Promise<Institution[]> {
    try {
      const all = await this.getAll();
      const q = term.trim().toLowerCase();
      if (!q) return all;
      return all.filter(
        (i) =>
          i.nome.toLowerCase().includes(q) ||
          i.descricaoCurta.toLowerCase().includes(q)
      );
    } catch (error) {
      wrapError('instituicoes.search', error);
    }
  },

  async paginate(options: PaginateOptions = {}): Promise<PageResult<Institution>> {
    try {
      const pageSize = options.pageSize ?? 20;
      const constraints: QueryConstraint[] = [
        orderBy(options.orderField ?? 'nome', options.orderDir ?? 'asc'),
        limit(pageSize + 1),
      ];
      const snap = await getDocs(query(col(COLLECTIONS.instituicoes), ...constraints));
      const items = await Promise.all(snap.docs.map((d) => this.getById(d.id)));
      const docs = items.filter(Boolean) as Institution[];
      return {
        items: docs.slice(0, pageSize),
        pageSize,
        hasMore: docs.length > pageSize,
      };
    } catch (error) {
      wrapError('instituicoes.paginate', error);
    }
  },

  async getByIds(ids: string[]): Promise<Institution[]> {
    try {
      if (ids.length === 0) return [];
      const all = await this.getAll();
      const set = new Set(ids);
      return all.filter((i) => set.has(i.id));
    } catch (error) {
      wrapError('instituicoes.getByIds', error);
    }
  },
};
