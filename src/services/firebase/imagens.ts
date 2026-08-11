import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import type { ImageFolder, ImageKind, Imagem } from '../../types/imagem';
import {
  IMAGE_REF_PREFIX,
  folderToImageKind,
  imageRefId,
  isImageRef,
  toImageRef,
} from '../../types/imagem';
import {
  COLLECTIONS,
  col,
  docRef,
  mapDoc,
  stripUndefined,
  timestamps,
  wrapError,
} from './helpers';
import {
  base64ToDataUrl,
  compressImage,
  dataUrlToBase64,
  type CompressResult,
} from '../../lib/imageCompress';

const memoryCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export const imagensService = {
  /** Persiste resultado já comprimido e devolve `img:{id}`. */
  async createFromCompressed(
    compressed: CompressResult,
    folder: ImageFolder,
    kind?: ImageKind
  ): Promise<string> {
    try {
      const imageKind = kind ?? folderToImageKind(folder);
      const base64 = dataUrlToBase64(compressed.dataUrl);
      if (!base64) throw new Error('Imagem inválida após compressão');

      const payload = {
        pasta: folder,
        tipo: imageKind,
        contentType: compressed.contentType,
        base64,
        width: compressed.width,
        height: compressed.height,
        bytes: compressed.bytes,
        ...timestamps(),
      };

      const ref = await addDoc(
        col(COLLECTIONS.imagens),
        stripUndefined(payload as unknown as Record<string, unknown>)
      );

      memoryCache.set(ref.id, compressed.dataUrl);
      return toImageRef(ref.id);
    } catch (error) {
      wrapError('imagens.createFromCompressed', error);
    }
  },

  /** Grava imagem comprimida na coleção `imagens` e devolve referência `img:{id}`. */
  async createFromDataUrl(
    dataUrl: string,
    folder: ImageFolder,
    kind?: ImageKind
  ): Promise<string> {
    try {
      const imageKind = kind ?? folderToImageKind(folder);
      const compressed = await compressImage(dataUrl, imageKind);
      return await this.createFromCompressed(compressed, folder, imageKind);
    } catch (error) {
      wrapError('imagens.createFromDataUrl', error);
    }
  },

  async getById(id: string): Promise<Imagem | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.imagens, id));
      if (!snap.exists()) return undefined;
      return mapDoc<Imagem>(snap as Parameters<typeof mapDoc>[0]);
    } catch (error) {
      wrapError('imagens.getById', error);
    }
  },

  async getDataUrl(id: string): Promise<string | null> {
    const cached = memoryCache.get(id);
    if (cached) return cached;

    const existing = inflight.get(id);
    if (existing) return existing;

    const task = (async () => {
      const doc = await this.getById(id);
      if (!doc?.base64) return '';
      const url = base64ToDataUrl(doc.base64, doc.contentType || 'image/jpeg');
      memoryCache.set(id, url);
      return url;
    })().finally(() => {
      inflight.delete(id);
    });

    inflight.set(id, task);
    return task;
  },

  /**
   * Resolve qualquer valor de imagem para URL exibível (http, data: ou img:).
   */
  async resolve(value: string | null | undefined): Promise<string> {
    if (!value) return '';
    if (!isImageRef(value)) return value;
    const id = imageRefId(value);
    if (!id) return '';
    return (await this.getDataUrl(id)) || '';
  },

  /** Resolve síncrono se já estiver em cache (http/data passam direto). */
  resolveCached(value: string | null | undefined): string {
    if (!value) return '';
    if (!isImageRef(value)) return value;
    return memoryCache.get(imageRefId(value)) || '';
  },

  async deleteByRef(value: string | null | undefined): Promise<void> {
    if (!value || !isImageRef(value)) return;
    const id = imageRefId(value);
    try {
      memoryCache.delete(id);
      await deleteDoc(docRef(COLLECTIONS.imagens, id));
    } catch (error) {
      console.error('[imagens.deleteByRef]', error);
    }
  },

  async listByFolder(folder: ImageFolder, max = 50): Promise<Imagem[]> {
    try {
      const q = query(
        col(COLLECTIONS.imagens),
        where('pasta', '==', folder),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Imagem>(d as Parameters<typeof mapDoc>[0]));
    } catch (error) {
      wrapError('imagens.listByFolder', error);
    }
  },
};

export { IMAGE_REF_PREFIX, isImageRef, toImageRef, imageRefId };
