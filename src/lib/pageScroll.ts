/**
 * Scroll da página pública: documento nativo (window), para zoom no celular
 * continuar navegável. Mantém API única para header/prompts/modais.
 */

export function getPublicScrollEl(): HTMLElement | null {
  return null;
}

export function getScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function getScrollMetrics(): {
  top: number;
  view: number;
  height: number;
} {
  return {
    top: window.scrollY || 0,
    view: window.innerHeight,
    height: Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight
    ),
  };
}

/** Trava o scroll do documento (modais / lightbox). */
export function lockPageScroll(): () => void {
  const scrollY = window.scrollY || 0;
  const body = document.body;
  const prevOverflow = body.style.overflow;
  const prevPosition = body.style.position;
  const prevTop = body.style.top;
  const prevWidth = body.style.width;

  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';

  return () => {
    body.style.overflow = prevOverflow;
    body.style.position = prevPosition;
    body.style.top = prevTop;
    body.style.width = prevWidth;
    window.scrollTo(0, scrollY);
  };
}

export function onPageScroll(
  handler: () => void,
  opts?: AddEventListenerOptions
): () => void {
  window.addEventListener('scroll', handler, opts);
  return () => window.removeEventListener('scroll', handler);
}
