import type { BaseDocument, CreateInput, UpdateInput } from './base';

export interface Banner extends BaseDocument {
  titulo: string;
  subtitulo: string;
  imagemDesktop: string;
  imagemMobile: string;
  eventoId?: string;
  ordem: number;
  dataInicio?: string;
  dataFim?: string;
  link?: string;
}

export type BannerCreate = CreateInput<Banner>;
export type BannerUpdate = UpdateInput<Banner>;
