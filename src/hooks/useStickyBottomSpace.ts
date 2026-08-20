import { useEffect } from 'react';

/**
 * Reserva espaço no rodapé (mobile) para barras fixas — evita o footer
 * ficar atrás do CTA e o scroll parecer travado no fim da página.
 */
export function useStickyBottomSpace(enabled: boolean, space = '5.75rem') {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.style.setProperty('--sticky-bottom-space', space);
    root.classList.add('has-sticky-bottom');
    return () => {
      root.style.removeProperty('--sticky-bottom-space');
      root.classList.remove('has-sticky-bottom');
    };
  }, [enabled, space]);
}
