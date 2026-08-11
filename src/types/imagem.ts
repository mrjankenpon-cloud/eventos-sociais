/** Metadados + payload de imagem na coleção Firestore `imagens`. */
export type ImageFolder =
  | 'banners'
  | 'patrocinadores'
  | 'instituicoes'
  | 'eventos'
  | 'eventos/galeria'
  | 'configuracoes'
  | 'misc';

export type ImageKind = 'logo' | 'banner' | 'destaque' | 'gallery';

export interface Imagem {
  id: string;
  pasta: ImageFolder;
  tipo: ImageKind;
  contentType: string;
  /** Base64 puro (sem prefixo data:) */
  base64: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
  updatedAt: string;
}

export const IMAGE_REF_PREFIX = 'img:';

export function toImageRef(id: string): string {
  return `${IMAGE_REF_PREFIX}${id}`;
}

export function isImageRef(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith(IMAGE_REF_PREFIX));
}

export function imageRefId(value: string): string {
  return value.slice(IMAGE_REF_PREFIX.length);
}

export function folderToImageKind(folder: ImageFolder): ImageKind {
  if (folder === 'banners' || folder === 'eventos') return 'banner';
  if (folder === 'eventos/galeria') return 'gallery';
  if (folder === 'patrocinadores' || folder === 'instituicoes') return 'logo';
  return 'logo';
}
