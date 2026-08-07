import type { BaseDocument, CreateInput, UpdateInput } from './base';

export interface Instituicao extends BaseDocument {
  nome: string;
  logo: string;
  imagemDestaque?: string;
  descricao: string;
  historia?: string;
  site?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  pix?: string;
}

export type InstituicaoCreate = CreateInput<Instituicao>;
export type InstituicaoUpdate = UpdateInput<Instituicao>;
