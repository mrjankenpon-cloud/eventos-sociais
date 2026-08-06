import type { Sponsor, SponsorFormData } from '../types/models/sponsor';
import { MOCK_SPONSORS } from '../mock/sponsors';
import { createId } from '../lib/utils';
import { DB_KEYS, loadCollection, saveCollection } from '../lib/persist';

class SponsorService {
  private read(): Sponsor[] {
    return loadCollection(DB_KEYS.sponsors, () => [...MOCK_SPONSORS]);
  }

  private write(items: Sponsor[]): void {
    saveCollection(DB_KEYS.sponsors, items);
  }

  async getAll(): Promise<Sponsor[]> {
    await new Promise((r) => setTimeout(r, 80));
    return [...this.read()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async getActive(): Promise<Sponsor[]> {
    const all = await this.getAll();
    return all.filter((s) => s.ativo);
  }

  async getById(id: string): Promise<Sponsor | undefined> {
    return this.read().find((s) => s.id === id);
  }

  async getByIds(ids: string[]): Promise<Sponsor[]> {
    const set = new Set(ids);
    return this.read().filter((s) => set.has(s.id));
  }

  ensureFromLegacy(partial: {
    id: string;
    nome: string;
    logo: string;
    site?: string;
    ativo?: boolean;
  }): Sponsor {
    const items = this.read();
    const existing = items.find((s) => s.id === partial.id);
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
    items.push(created);
    this.write(items);
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
    const items = this.read();
    items.push(item);
    this.write(items);
    return item;
  }

  async update(id: string, data: Partial<SponsorFormData>): Promise<Sponsor> {
    const items = this.read();
    const index = items.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Patrocinador não encontrado');
    items[index] = {
      ...items[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.write(items);
    return items[index];
  }

  async delete(id: string): Promise<void> {
    this.write(this.read().filter((s) => s.id !== id));
  }
}

export const sponsorService = new SponsorService();
