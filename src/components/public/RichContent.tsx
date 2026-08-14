import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeHtml } from '../../lib/siteContent';
import { imagensService } from '../../services/firebase/imagens';
import { cn } from '../../lib/utils';

/** Renderiza o HTML escrito pelo admin, já higienizado. */
export function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const safeHtml = useMemo(() => sanitizeHtml(html), [html]);

  // Imagens guardadas na coleção `imagens` chegam como `img:{id}`.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let active = true;
    const images = Array.from(node.querySelectorAll('img'));
    for (const img of images) {
      const raw = img.getAttribute('src') ?? '';
      if (!raw.startsWith('img:')) continue;
      void imagensService.resolve(raw).then((url) => {
        if (active && url) img.setAttribute('src', url);
      });
    }
    return () => {
      active = false;
    };
  }, [safeHtml]);

  // Links internos navegam por rota, sem recarregar o site.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a');
    const href = anchor?.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    event.preventDefault();
    navigate(href);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={cn('site-content-doc', className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
