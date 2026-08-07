import type { EventFormData, GalleryImage } from '../../types/models/event';
import { ensureStoredImage, deleteImage } from './storage';

/** Faz upload de data URLs do evento para o Storage e devolve payload com URLs públicas. */
export async function persistEventMedia(
  data: Partial<EventFormData>,
  previous?: Partial<EventFormData> | null
): Promise<Partial<EventFormData>> {
  const next = { ...data };

  if (typeof next.banner === 'string') {
    next.banner = await ensureStoredImage(next.banner, 'eventos', previous?.banner);
  }

  if (Array.isArray(next.imagens)) {
    const prevById = new Map((previous?.imagens ?? []).map((i) => [i.id, i]));
    next.imagens = await Promise.all(
      next.imagens.map(async (img: GalleryImage) => {
        const old = prevById.get(img.id)?.url;
        const url = await ensureStoredImage(img.url, 'eventos/galeria', old);
        return { ...img, url };
      })
    );

    // Remove imagens que saíram da galeria
    for (const old of previous?.imagens ?? []) {
      if (!next.imagens.some((i) => i.id === old.id) && old.url) {
        await deleteImage(old.url);
      }
    }
  }

  if (Array.isArray(next.galeria)) {
    next.galeria = await Promise.all(
      next.galeria.map((url, index) =>
        ensureStoredImage(url, 'eventos/galeria', previous?.galeria?.[index])
      )
    );
  }

  return next;
}
