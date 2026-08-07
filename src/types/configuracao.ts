import type { BaseDocument, CreateInput, UpdateInput } from './base';

export interface Configuracao extends BaseDocument {
  nomeSistema: string;
  logotipo: string;
  descricao: string;
  email: string;
  telefone: string;
  endereco: string;
  rodape: string;
  redesSociais: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    site?: string;
  };
  tema: {
    primaria?: string;
    secundaria?: string;
    modo?: 'claro' | 'escuro' | 'sistema';
  };
}

export type ConfiguracaoCreate = CreateInput<Configuracao>;
export type ConfiguracaoUpdate = UpdateInput<Configuracao>;
