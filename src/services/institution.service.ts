import type { Institution, InstitutionFormData } from '../types/models/institution';
import { MOCK_INSTITUTIONS } from '../mock/institutions';
import { createId } from '../lib/utils';
import { DB_KEYS, loadCollection, saveCollection } from '../lib/persist';

class InstitutionService {
  private read(): Institution[] {
    return loadCollection(DB_KEYS.institutions, () => [...MOCK_INSTITUTIONS]);
  }

  private write(items: Institution[]): void {
    saveCollection(DB_KEYS.institutions, items);
  }

  async getAll(): Promise<Institution[]> {
    await new Promise((r) => setTimeout(r, 80));
    return [...this.read()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async getActive(): Promise<Institution[]> {
    const all = await this.getAll();
    return all.filter((i) => i.ativo);
  }

  async getById(id: string): Promise<Institution | undefined> {
    return this.read().find((i) => i.id === id);
  }

  async getByIds(ids: string[]): Promise<Institution[]> {
    const set = new Set(ids);
    return this.read().filter((i) => set.has(i.id));
  }

  async create(data: InstitutionFormData): Promise<Institution> {
    const now = new Date().toISOString();
    const item: Institution = {
      ...data,
      id: createId('inst'),
      createdAt: now,
      updatedAt: now,
    };
    const items = this.read();
    items.push(item);
    this.write(items);
    return item;
  }

  async update(id: string, data: Partial<InstitutionFormData>): Promise<Institution> {
    const items = this.read();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Instituição não encontrada');
    items[index] = {
      ...items[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.write(items);
    return items[index];
  }

  async delete(id: string): Promise<void> {
    this.write(this.read().filter((i) => i.id !== id));
  }
}

export const institutionService = new InstitutionService();
