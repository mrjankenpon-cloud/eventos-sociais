import React, { useCallback, useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  ACCEPTED_IMAGE_EXT,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_MB,
} from '../../../lib/eventForm';
import type { ImageKind } from '../../../types/imagem';

interface ImageUploadZoneProps {
  onFiles: (files: File[]) => void | Promise<void>;
  multiple?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  /** Preset de compressão ao ler o arquivo (padrão: logo). */
  imageKind?: ImageKind;
}

export function ImageUploadZone({
  onFiles,
  multiple = false,
  label = 'Arraste imagens ou clique para selecionar',
  hint = `JPG, PNG ou WEBP · até ${MAX_IMAGE_SIZE_MB}MB`,
  className,
  disabled,
  imageKind = 'logo',
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const process = useCallback(
    async (list: FileList | File[]) => {
      setError(null);
      const files = Array.from(list);
      const valid: File[] = [];

      for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          setError(`Formato inválido: ${file.name}. Use JPG, PNG ou WEBP.`);
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          setError(`${file.name} excede ${MAX_IMAGE_SIZE_MB}MB.`);
          continue;
        }
        valid.push(file);
      }

      if (valid.length === 0) return;

      setProgress(0);
      // Simulated progress while reading files (client-side “upload”)
      const steps = [15, 35, 55, 75, 90, 100];
      for (const step of steps) {
        await new Promise((r) => setTimeout(r, 80));
        setProgress(step);
      }

      await onFiles(multiple ? valid : valid.slice(0, 1));
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    },
    [multiple, onFiles]
  );

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        disabled={disabled || progress !== null}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) void process(e.dataTransfer.files);
        }}
        className={cn(
          'w-full rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
          dragging
            ? 'border-brand bg-brand-muted/50'
            : 'border-gray-200 bg-gray-50 hover:border-brand/40 hover:bg-white',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-sm">
          {progress !== null ? <Upload size={22} /> : <ImagePlus size={22} />}
        </div>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="mt-1 text-xs text-gray-400">{hint}</p>

        {progress !== null && (
          <div className="mt-4 mx-auto max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-brand transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-bold text-brand">{progress}%</p>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_EXT}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) void process(e.target.files);
        }}
      />

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-red-500" role="alert">
          <X size={12} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function readFileAsDataUrl(
  file: File,
  kind: ImageKind = 'logo'
): Promise<string> {
  return import('../../../lib/imageCompress').then(({ compressImageToDataUrl }) =>
    compressImageToDataUrl(file, kind)
  );
}
