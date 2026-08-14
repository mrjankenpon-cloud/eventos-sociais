export interface SiteVideo {
  id: string;
  titulo: string;
  url: string;
  /** Miniatura opcional; se vazio, tenta derivar do YouTube/Vimeo. */
  thumbnailUrl?: string;
  ordem: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SiteVideoFormData = Omit<SiteVideo, 'id' | 'createdAt' | 'updatedAt'>;
