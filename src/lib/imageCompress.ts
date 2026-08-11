import type { ImageKind } from '../types/imagem';

export type CompressPreset = {
  maxEdge: number;
  /** Qualidade inicial JPEG/WebP (0–1). */
  quality: number;
  /** Teto em bytes do arquivo comprimido. */
  maxBytes: number;
  /** Qualidade mínima ao reduzir tamanho. */
  minQuality: number;
};

/**
 * Presets pensados para o site público:
 * - logos nítidos (com transparência quando houver)
 * - banners/destaques em boa resolução
 */
export const IMAGE_PRESETS: Record<ImageKind, CompressPreset> = {
  logo: {
    maxEdge: 900,
    quality: 0.92,
    maxBytes: 380_000,
    minQuality: 0.72,
  },
  banner: {
    maxEdge: 1920,
    quality: 0.88,
    maxBytes: 720_000,
    minQuality: 0.7,
  },
  destaque: {
    maxEdge: 1600,
    quality: 0.88,
    maxBytes: 600_000,
    minQuality: 0.7,
  },
  gallery: {
    maxEdge: 1600,
    quality: 0.86,
    maxBytes: 550_000,
    minQuality: 0.68,
  },
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem'))),
      type,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler imagem'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem'));
    img.src = src;
  });
}

function mimeFromSource(source: File | Blob | string): string {
  if (typeof source === 'string') {
    const match = /^data:([^;]+);/i.exec(source);
    return match?.[1]?.toLowerCase() || 'image/jpeg';
  }
  return (source.type || 'image/jpeg').toLowerCase();
}

/** Detecta pixels com alpha < 250 (transparência real). */
function canvasHasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 250) return true;
    }
  } catch {
    // cross-origin / segurança — assume opaco
  }
  return false;
}

export type CompressResult = {
  dataUrl: string;
  contentType: string;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Comprime mantendo qualidade visual boa para o site.
 * Logos com transparência → WebP/PNG; fotos/banners → WebP/JPEG.
 */
export async function compressImage(
  source: File | Blob | string,
  kind: ImageKind = 'logo'
): Promise<CompressResult> {
  const preset = IMAGE_PRESETS[kind];
  let quality = preset.quality;

  const inputDataUrl =
    typeof source === 'string' ? source : await blobToDataUrl(source);
  const sourceMime = mimeFromSource(source);
  const img = await loadImage(inputDataUrl);

  const scale = Math.min(1, preset.maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas não suportado neste navegador');

  // Fundo transparente para logos; branco só se for JPEG final opaco
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const wantsAlpha =
    kind === 'logo' &&
    (sourceMime.includes('png') ||
      sourceMime.includes('webp') ||
      canvasHasTransparency(ctx, width, height));

  const tryTypes = wantsAlpha
    ? (['image/webp', 'image/png'] as const)
    : (['image/webp', 'image/jpeg'] as const);

  let best: { blob: Blob; type: string } | null = null;

  for (const type of tryTypes) {
    quality = preset.quality;
    let blob = await canvasToBlob(canvas, type, type === 'image/png' ? undefined : quality);

    if (type !== 'image/png') {
      while (blob.size > preset.maxBytes && quality > preset.minQuality) {
        quality = Math.max(preset.minQuality, quality - 0.05);
        blob = await canvasToBlob(canvas, type, quality);
      }
    }

    if (!best || blob.size < best.blob.size) {
      best = { blob, type };
    }

    // Já cabe com boa qualidade — usa este formato
    if (blob.size <= preset.maxBytes) {
      best = { blob, type };
      break;
    }
  }

  if (!best) throw new Error('Falha ao comprimir imagem');

  // PNG grande demais: força WebP mesmo com alpha
  if (best.blob.size > preset.maxBytes && best.type === 'image/png') {
    quality = preset.quality;
    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    while (blob.size > preset.maxBytes && quality > preset.minQuality) {
      quality = Math.max(preset.minQuality, quality - 0.05);
      blob = await canvasToBlob(canvas, 'image/webp', quality);
    }
    best = { blob, type: 'image/webp' };
  }

  if (best.blob.size > preset.maxBytes) {
    throw new Error(
      'Imagem ainda grande demais após compressão. Use um arquivo menor ou menos detalhado.'
    );
  }

  const dataUrl = await blobToDataUrl(best.blob);
  return {
    dataUrl,
    contentType: best.type,
    width,
    height,
    bytes: best.blob.size,
  };
}

/** @deprecated Prefer `compressImage` — mantido para callers existentes. */
export async function compressImageToDataUrl(
  source: File | Blob | string,
  kindOrOptions?: ImageKind | { maxEdge?: number; quality?: number; maxBytes?: number }
): Promise<string> {
  const kind: ImageKind =
    typeof kindOrOptions === 'string' ? kindOrOptions : 'logo';
  const result = await compressImage(source, kind);
  return result.dataUrl;
}

export function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1] || '';
}

export function base64ToDataUrl(base64: string, contentType: string): string {
  return `data:${contentType};base64,${base64}`;
}
