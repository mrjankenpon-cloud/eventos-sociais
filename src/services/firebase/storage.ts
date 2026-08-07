import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadString,
} from 'firebase/storage';
import { storage } from '../../firebase/storage';

export type StorageFolder =
  | 'banners'
  | 'patrocinadores'
  | 'instituicoes'
  | 'eventos'
  | 'eventos/galeria'
  | 'configuracoes'
  | 'misc';

function uniqueName(originalName?: string): string {
  const ext =
    originalName?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'jpg';
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
    const name = fileName || uniqueName(file instanceof File ? file.name : undefined);
    const path = `${folder}/${name}`;
    const storageRef = ref(storage, path);

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

    return await getDownloadURL(storageRef);
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
    const path = isFirebaseStorageUrl(urlOrPath)
      ? storagePathFromUrl(urlOrPath)
      : urlOrPath.includes('/')
        ? urlOrPath
        : null;
    if (!path) return;
    await deleteObject(ref(storage, path));
  } catch (error) {
    // Objeto inexistente não deve quebrar o fluxo
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
    if (oldUrl && oldUrl !== url && isFirebaseStorageUrl(oldUrl)) {
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
 * Se o valor for data URL, faz upload e retorna URL pública.
 * Se for URL remota, mantém (e opcionalmente substitui a antiga).
 */
export async function ensureStoredImage(
  value: string | undefined | null,
  folder: StorageFolder,
  oldUrl?: string | null
): Promise<string> {
  if (!value) return '';
  if (isDataUrl(value)) {
    return replaceImage(value, folder, oldUrl);
  }
  if (oldUrl && value !== oldUrl && isFirebaseStorageUrl(oldUrl)) {
    // URL nova externa/diferente: remove antiga do Storage
    await deleteImage(oldUrl);
  }
  return value;
}

export const storageService = {
  uploadImage,
  deleteImage,
  replaceImage,
  ensureStoredImage,
  storagePathFromUrl,
};
