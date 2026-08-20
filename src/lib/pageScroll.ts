/** Container de scroll do site público / PWA (`#public-scroll`). */
export function getPublicScrollEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('public-scroll');
}

export function getScrollTop(): number {
  const el = getPublicScrollEl();
  if (el) return el.scrollTop;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function getScrollMetrics(): {
  top: number;
  view: number;
  height: number;
} {
  const el = getPublicScrollEl();
  if (el) {
    return {
      top: el.scrollTop,
      view: el.clientHeight,
      height: el.scrollHeight,
    };
  }
  return {
    top: window.scrollY || 0,
    view: window.innerHeight,
    height: Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    ),
  };
}

/** Trava o scroll da página (PWA usa #public-scroll; fallback body). */
export function lockPageScroll(): () => void {
  const el = getPublicScrollEl();
  if (el) {
    const prev = el.style.overflow;
    el.style.overflow = 'hidden';
    return () => {
      el.style.overflow = prev;
    };
  }
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = prev;
  };
}

export function onPageScroll(
  handler: () => void,
  opts?: AddEventListenerOptions
): () => void {
  const el = getPublicScrollEl();
  if (el) {
    el.addEventListener('scroll', handler, opts);
    return () => el.removeEventListener('scroll', handler);
  }
  window.addEventListener('scroll', handler, opts);
  return () => window.removeEventListener('scroll', handler);
}
