import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { imagensService } from '../../services/firebase/imagens';
import { isImageRef } from '../../types/imagem';

type AppImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src'
> & {
  src?: string | null;
  /** Placeholder enquanto resolve referência img: */
  fallbackClassName?: string;
};

/**
 * Exibe http(s), data: ou referência `img:{id}` da coleção Firestore `imagens`.
 */
export function AppImage({
  src,
  alt = '',
  className,
  fallbackClassName,
  ...rest
}: AppImageProps) {
  const initial =
    src && !isImageRef(src) ? src : imagensService.resolveCached(src);
  const [url, setUrl] = useState(initial);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (!src) {
      setUrl('');
      return;
    }

    if (!isImageRef(src)) {
      setUrl(src);
      return;
    }

    const cached = imagensService.resolveCached(src);
    if (cached) {
      setUrl(cached);
      return;
    }

    setUrl('');
    void imagensService
      .resolve(src)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!url || failed) {
    return (
      <div
        className={cn('bg-gray-100', className, fallbackClassName)}
        aria-hidden={alt ? undefined : true}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
