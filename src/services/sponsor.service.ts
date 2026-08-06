import type { Sponsor, SponsorFormData } from '../types/models/sponsor';
import { MOCK_SPONSORS } from '../mock/sponsors';
import { createId } from '../lib/utils';

class SponsorService {
  private items: Sponsor[] = [...MOCK_SPONSORS];

  async getAll(): Promise<Sponsor[]> {
    await new Promise((r) => setTimeout(r, 250));
    return [...this.items].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async getActive(): Promise<Sponsor[]> {
    const all = await this.getAll();
    return all.filter((s) => s.ativo);
  }

  async getById(id: string): Promise<Sponsor | undefined> {
    await new Promise((r) => setTimeout(r, 120));
    return this.items.find((s) => s.id === id);
  }

  async getByIds(ids: string[]): Promise<Sponsor[]> {
    const set = new Set(ids);
    return this.items.filter((s) => set.has(s.id));
  }

  /** Sync seed used when migrating legacy embedded sponsors */
  ensureFromLegacy(partial: {
    id: string;
    nome: string;
    logo: string;
    site?: string;
    ativo?: boolean;
  }): Sponsor {
    const existing = this.items.find((s) => s.id === partial.id);
    if (existing) return existing;
    const now = new Date().toISOString();
    const created: Sponsor = {
      id: partial.id || createId('sp'),
      nome: partial.nome,
      logo: partial.logo,
      site: partial.site || '',
      instagram: '',
      facebook: '',
      email: '',
      telefone: '',
      descricao: '',
      ativo: partial.ativo ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(created);
    return created;
  }

  async create(data: SponsorFormData): Promise<Sponsor> {
    const now = new Date().toISOString();
    const item: Sponsor = {
      ...data,
      id: createId('sp'),
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  async update(id: string, data: Partial<SponsorFormData>): Promise<Sponsor> {
    const index = this.items.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Patrocinador não encontrado');
    this.items[index] = {
      ...this.items[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.items[index];
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((s) => s.id !== id);
  }
}

export const sponsorService = new SponsorService();
