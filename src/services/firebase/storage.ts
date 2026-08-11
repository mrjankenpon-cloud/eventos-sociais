import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadString,
} from 'firebase/storage';
import { storage } from '../../firebase/storage';
import {
  compressImage,
  dataUrlByteLength,
} from '../../lib/imageCompress';
import {
  folderToImageKind,
  isImageRef,
  type ImageFolder,
  type ImageKind,
} from '../../types/imagem';
import { imagensService } from './imagens';

export type StorageFolder = ImageFolder;

const UPLOAD_TIMEOUT_MS = 5_000;

/** null = ainda não testado; false = Storage indisponível neste ambiente */
let storageWritable: boolean | null = null;

function uniqueName(originalName?: string, contentType?: string): string {
  const fromType =
    contentType === 'image/webp'
      ? 'webp'
      : contentType === 'image/png'
        ? 'png'
        : 'jpg';
  const ext =
    originalName?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    fromType;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${id}.${ext}`;
}

function contentTypeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;]+);/i.exec(dataUrl);
  return match?.[1] || 'image/jpeg';
}

function isDataUrl(value: string): boolean {
  return value.startsWith('data:');
}

function isFirebaseStorageUrl(value: string): boolean {
  return (
    value.includes('firebasestorage.googleapis.com') ||
    value.includes('firebasestorage.app')
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function kindForFolder(folder: StorageFolder, explicit?: ImageKind): ImageKind {
  if (explicit) return explicit;
  return folderToImageKind(folder);
}

/** Extrai path do Storage a partir da URL pública (quando possível). */
export function storagePathFromUrl(url: string): string | null {
  try {
    const decoded = decodeURIComponent(url);
    const marker = '/o/';
    const idx = decoded.indexOf(marker);
    if (idx === -1) return null;
    const rest = decoded.slice(idx + marker.length);
    const path = rest.split('?')[0];
    return path || null;
  } catch {
    return null;
  }
}

export async function uploadImage(
  file: File | Blob | string,
  folder: StorageFolder,
  fileName?: string
): Promise<string> {
  try {
    const name =
      fileName ||
      uniqueName(
        file instanceof File ? file.name : undefined,
        typeof file === 'string' ? contentTypeFromDataUrl(file) : file.type
      );
    const path = `${folder}/${name}`;
    const storageRef = ref(storage, path);

    const upload = async () => {
      if (typeof file === 'string') {
        if (!isDataUrl(file)) {
          throw new Error('uploadImage: string deve ser data URL');
        }
        await uploadString(storageRef, file, 'data_url', {
          contentType: contentTypeFromDataUrl(file),
          cacheControl: 'public,max-age=31536000',
        });
      } else {
        await uploadBytes(storageRef, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: 'public,max-age=31536000',
        });
      }
      return getDownloadURL(storageRef);
    };

    return await withTimeout(
      upload(),
      UPLOAD_TIMEOUT_MS,
      'Upload de imagem demorou demais (Firebase Storage).'
    );
  } catch (error) {
    console.error('[storage.uploadImage]', error);
    throw new Error(
      `[storage.uploadImage] ${error instanceof Error ? error.message : 'Falha no upload'}`
    );
  }
}

export async function deleteImage(urlOrPath: string): Promise<void> {
  try {
    if (!urlOrPath) return;
    if (isDataUrl(urlOrPath)) return;
    if (isImageRef(urlOrPath)) {
      await imagensService.deleteByRef(urlOrPath);
      return;
    }
    const path = isFirebaseStorageUrl(urlOrPath)
      ? storagePathFromUrl(urlOrPath)
      : urlOrPath.includes('/')
        ? urlOrPath
        : null;
    if (!path) return;
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.error('[storage.deleteImage]', error);
  }
}

export async function replaceImage(
  newFile: File | Blob | string,
  folder: StorageFolder,
  oldUrl?: string | null,
  fileName?: string
): Promise<string> {
  try {
    const url = await uploadImage(newFile, folder, fileName);
    if (oldUrl && oldUrl !== url) {
      await deleteImage(oldUrl);
    }
    return url;
  } catch (error) {
    console.error('[storage.replaceImage]', error);
    throw new Error(
      `[storage.replaceImage] ${error instanceof Error ? error.message : 'Falha ao substituir'}`
    );
  }
}

/**
 * Pipeline de mídia:
 * 1) Comprime com preset de qualidade (logo/banner/…)
 * 2) Tenta Firebase Storage (se billing/bucket existir)
 * 3) Senão grava na coleção Firestore `imagens` e devolve `img:{id}`
 */
export async function ensureStoredImage(
  value: string | undefined | null,
  folder: StorageFolder,
  oldUrl?: string | null,
  kind?: ImageKind
): Promise<string> {
  if (!value) return '';

  // Já é referência persistida — mantém
  if (isImageRef(value)) {
    if (oldUrl && oldUrl !== value) await deleteImage(oldUrl);
    return value;
  }

  if (!isDataUrl(value)) {
    if (oldUrl && value !== oldUrl) await deleteImage(oldUrl);
    return value;
  }

  const imageKind = kindForFolder(folder, kind);
  const compressed = await compressImage(value, imageKind);

  // Storage disponível e funcionando
  if (storageWritable !== false) {
    try {
      const url = await replaceImage(compressed.dataUrl, folder, oldUrl);
      storageWritable = true;
      return url;
    } catch (error) {
      storageWritable = false;
      console.warn(
        '[storage.ensureStoredImage] Storage indisponível — usando coleção imagens',
        error
      );
    }
  }

  // Banco Firestore `imagens` (logos, parceiros, banners)
  if (dataUrlByteLength(compressed.dataUrl) > 900_000) {
    throw new Error(
      'Imagem grande demais para o banco de imagens. Use um arquivo menor.'
    );
  }

  const refId = await imagensService.createFromCompressed(
    compressed,
    folder,
    imageKind
  );
  if (oldUrl && oldUrl !== refId) await deleteImage(oldUrl);
  return refId;
}

export const storageService = {
  uploadImage,
  deleteImage,
  replaceImage,
  ensureStoredImage,
  storagePathFromUrl,
};
