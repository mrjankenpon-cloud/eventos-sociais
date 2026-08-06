import React, { useState } from 'react';
import { GripVertical, Star, Trash2 } from 'lucide-react';
import type { GalleryImage } from '../../../types/models/event';
import { createId } from '../../../lib/eventForm';
import { ImageUploadZone, readFileAsDataUrl } from './ImageUploadZone';
import { cn } from '../../../lib/utils';

interface GalleryManagerProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

export function GalleryManager({ images, onChange }: GalleryManagerProps) {
  const [dragId, setDragId] = useState<string | null>(null);

  const sorted = [...images].sort((a, b) => a.order - b.order);

  const handleFiles = async (files: File[]) => {
    const next = [...sorted];
    for (const file of files) {
      const url = await readFileAsDataUrl(file);
      next.push({
        id: createId('img'),
        url,
        name: file.name,
        isCover: next.length === 0,
        order: next.length,
      });
    }
    if (!next.some((i) => i.isCover) && next[0]) {
      next[0] = { ...next[0], isCover: true };
    }
    onChange(next.map((img, order) => ({ ...img, order })));
  };

  const setCover = (id: string) => {
    onChange(
      sorted.map((img, order) => ({
        ...img,
        order,
        isCover: img.id === id,
      }))
    );
  };

  const remove = (id: string) => {
    const next = sorted.filter((img) => img.id !== id);
    if (next.length && !next.some((i) => i.isCover)) {
      next[0] = { ...next[0], isCover: true };
    }
    onChange(next.map((img, order) => ({ ...img, order })));
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const list = [...sorted];
    const from = list.findIndex((i) => i.id === dragId);
    const to = list.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    onChange(list.map((img, order) => ({ ...img, order })));
    setDragId(null);
  };

  return (
    <div className="space-y-5">
      <ImageUploadZone
        multiple
        onFiles={handleFiles}
        label="Arraste imagens da galeria ou clique para enviar"
        hint="A primeira imagem pode ser definida como capa · JPG, PNG, WEBP"
      />

      {sorted.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">
          Nenhuma imagem adicionada ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sorted.map((img) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => setDragId(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(img.id)}
              className={cn(
                'group relative aspect-[4/3] overflow-hidden rounded-2xl border bg-gray-50',
                img.isCover ? 'border-brand ring-2 ring-brand/20' : 'border-gray-100',
                dragId === img.id && 'opacity-60'
              )}
            >
              <img src={img.url} alt={img.name || 'Imagem'} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute left-2 top-2 flex items-center gap-1">
                <span className="rounded-lg bg-black/50 p-1.5 text-white cursor-grab" title="Arrastar">
                  <GripVertical size={14} />
                </span>
                {img.isCover && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    Capa
                  </span>
                )}
              </div>
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.isCover && (
                  <button
                    type="button"
                    onClick={() => setCover(img.id)}
                    className="rounded-xl bg-white/95 p-2 text-amber-500 hover:bg-white"
                    title="Definir como capa"
                    aria-label="Definir como capa"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  className="rounded-xl bg-white/95 p-2 text-red-500 hover:bg-white"
                  title="Remover"
                  aria-label="Remover imagem"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
