export interface Banner {
  id: string;
  eventId: string;
  titulo: string;
  subtitulo?: string;
  imagem: string;
  link?: string;
  ordem: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BannerFormData = Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>;
