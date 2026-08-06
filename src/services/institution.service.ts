import type { Institution, InstitutionFormData } from '../types/models/institution';
import { MOCK_INSTITUTIONS } from '../mock/institutions';
import { createId } from '../lib/utils';

class InstitutionService {
  private items: Institution[] = [...MOCK_INSTITUTIONS];

  async getAll(): Promise<Institution[]> {
    await new Promise((r) => setTimeout(r, 250));
    return [...this.items].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async getActive(): Promise<Institution[]> {
    const all = await this.getAll();
    return all.filter((i) => i.ativo);
  }

  async getById(id: string): Promise<Institution | undefined> {
    await new Promise((r) => setTimeout(r, 120));
    return this.items.find((i) => i.id === id);
  }

  async getByIds(ids: string[]): Promise<Institution[]> {
    const set = new Set(ids);
    return this.items.filter((i) => set.has(i.id));
  }

  async create(data: InstitutionFormData): Promise<Institution> {
    const now = new Date().toISOString();
    const item: Institution = {
      ...data,
      id: createId('inst'),
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  async update(id: string, data: Partial<InstitutionFormData>): Promise<Institution> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Instituição não encontrada');
    this.items[index] = {
      ...this.items[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.items[index];
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
  }
}

export const institutionService = new InstitutionService();
