const CRAWLER =
  /Googlebot|Google-InspectionTool|Storebot-Google|Bingbot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot/i;

function shouldRegisterServiceWorker(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  return !CRAWLER.test(navigator.userAgent || '');
}

export function registerPwa(): void {
  if (!shouldRegisterServiceWorker()) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        /* crawlers and browsers sem SW não devem quebrar a página */
      });
  });
}
