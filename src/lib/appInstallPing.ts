import { useEffect } from 'react';
import { isPwaInstalled } from '../hooks/usePwaInstall';
import { pwaInstallsService } from '../services/firebase/pwaInstalls';

let sessionPing = false;

export async function pingInstalledApp(): Promise<void> {
  if (sessionPing) return;
  if (typeof window === 'undefined') return;
  sessionPing = true;
  try {
    await pwaInstallsService.ping();
  } catch (error) {
    sessionPing = false;
    console.warn('[pwa] não foi possível registrar a instalação', error);
  }
}

/** Grava o aparelho quando o App Delphos está instalado. */
export function useInstalledAppPing() {
  useEffect(() => {
    if (isPwaInstalled()) {
      void pingInstalledApp();
    }

    const onInstalled = () => {
      sessionPing = false;
      void pingInstalledApp();
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);
}
