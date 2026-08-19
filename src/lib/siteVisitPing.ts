import { useEffect } from 'react';
import { firebaseConfig } from '../firebase/config';

const KEY = 'delphos.visit.logged';

function functionsBaseUrl(): string {
  const override = String(import.meta.env.VITE_FUNCTIONS_URL || '').trim();
  if (override) return override.replace(/\/$/, '');
  const region =
    String(import.meta.env.VITE_FUNCTIONS_REGION || '').trim() || 'us-central1';
  const project = firebaseConfig.projectId || 'eventosociais-c057d';
  return `https://${region}-${project}.cloudfunctions.net`;
}

/** Uma chamada por aba/sessão — não a cada clique. */
export function usePublicSiteVisitPing() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      const ua = navigator.userAgent || '';
      if (ua.length < 12 || /bot|crawler|spider|lighthouse|headless/i.test(ua)) {
        return;
      }
      sessionStorage.setItem(KEY, '1');
    } catch {
      return;
    }
    const url = `${functionsBaseUrl()}/recordSiteVisit`;
    void fetch(url, {
      method: 'GET',
      keepalive: true,
      mode: 'no-cors',
    }).catch(() => undefined);
  }, []);
}
