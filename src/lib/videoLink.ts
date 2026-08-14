export type VideoProvider = 'youtube' | 'vimeo' | 'other';

export interface ParsedVideoLink {
  provider: VideoProvider;
  /** ID nativo quando for YouTube/Vimeo. */
  id?: string;
  /** URL original normalizada. */
  url: string;
  /** URL de incorporação (iframe), se aplicável. */
  embedUrl?: string;
  /** Miniatura automática, se conhecida. */
  thumbnailUrl?: string;
}

function safeUrl(raw: string): URL | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function youtubeIdFromUrl(url: URL): string | undefined {
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id || undefined;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v') || undefined;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
      return parts[1] || undefined;
    }
  }
  return undefined;
}

function vimeoIdFromUrl(url: URL): string | undefined {
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return undefined;
  const parts = url.pathname.split('/').filter(Boolean);
  if (host === 'player.vimeo.com' && parts[0] === 'video') {
    return parts[1] || undefined;
  }
  const numeric = parts.find((p) => /^\d+$/.test(p));
  return numeric;
}

/** Extrai provedor, ID, embed e miniatura a partir de um link de vídeo. */
export function parseVideoLink(raw: string): ParsedVideoLink | null {
  const url = safeUrl(raw);
  if (!url) return null;

  const yt = youtubeIdFromUrl(url);
  if (yt) {
    return {
      provider: 'youtube',
      id: yt,
      url: `https://www.youtube.com/watch?v=${yt}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  const vimeo = vimeoIdFromUrl(url);
  if (vimeo) {
    return {
      provider: 'vimeo',
      id: vimeo,
      url: `https://vimeo.com/${vimeo}`,
      embedUrl: `https://player.vimeo.com/video/${vimeo}?autoplay=1`,
      thumbnailUrl: `https://vumbnail.com/${vimeo}.jpg`,
    };
  }

  return {
    provider: 'other',
    url: url.toString(),
  };
}

export function isValidVideoUrl(raw: string): boolean {
  return Boolean(parseVideoLink(raw));
}

/** Miniatura efetiva: override do admin ou automática do provedor. */
export function resolveVideoThumbnail(input: {
  url: string;
  thumbnailUrl?: string;
}): string | undefined {
  const custom = input.thumbnailUrl?.trim();
  if (custom) return custom;
  return parseVideoLink(input.url)?.thumbnailUrl;
}
