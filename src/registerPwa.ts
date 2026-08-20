const CRAWLER =
  /Googlebot|Google-InspectionTool|Storebot-Google|Bingbot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot/i;

function shouldRegisterServiceWorker(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  return !CRAWLER.test(navigator.userAgent || '');
}

/**
 * Registra o SW sem forçar reload — reload no controllerchange fazia o app
 * instalado piscar/travar ao abrir (home + rodapé).
 */
export function registerPwa(): void {
  if (!shouldRegisterServiceWorker()) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        void reg.update().catch(() => undefined);
      })
      .catch(() => {
        /* crawlers e browsers sem SW não devem quebrar a página */
      });
  });
}
