const CRAWLER =
  /Googlebot|Google-InspectionTool|Storebot-Google|Bingbot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot/i;

function shouldRegisterServiceWorker(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  return !CRAWLER.test(navigator.userAgent || '');
}

export function registerPwa(): void {
  if (!shouldRegisterServiceWorker()) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        void reg.update();
        // Se já houver worker esperando, ativa na próxima visita.
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(() => {
        /* crawlers e browsers sem SW não devem quebrar a página */
      });
  });
}
