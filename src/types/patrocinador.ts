import type { BaseDocument, CreateInput, UpdateInput } from './base';

export interface Patrocinador extends BaseDocument {
  nome: string;
  logo: string;
  site?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
  telefone?: string;
  descricao?: string;
}

export type PatrocinadorCreate = CreateInput<Patrocinador>;
export type PatrocinadorUpdate = UpdateInput<Patrocinador>;
