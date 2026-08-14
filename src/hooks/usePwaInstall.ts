import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * O evento `beforeinstallprompt` chega uma única vez por carregamento e antes de
 * qualquer componente montar, por isso ele é capturado no módulo e distribuído
 * aos assinantes.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

function isInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const SNOOZE_KEY = 'delphos:pwa-install-snooze';
const SNOOZE_DAYS = 14;

/** Guarda a recusa para o convite flutuante não reaparecer a cada visita. */
export function snoozeInstallPrompt() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    // Sem storage disponível: o convite volta na próxima visita.
  }
}

export function isInstallPromptSnoozed() {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o convite automático do navegador; a instalação fica sob demanda.
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

/** Expõe se o app pode ser instalado e dispara o convite nativo sob demanda. */
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(
    () => Boolean(deferredPrompt) && !isInstalled()
  );

  useEffect(() => {
    const sync = () => setCanInstall(Boolean(deferredPrompt) && !isInstalled());
    subscribers.add(sync);
    sync();
    return () => {
      subscribers.delete(sync);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt;
    if (!prompt) return;

    // O mesmo evento não pode ser reutilizado; o navegador reemite em uma nova visita.
    deferredPrompt = null;
    notify();

    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.warn('Não foi possível abrir o instalador do app:', error);
    }
  }, []);

  return { canInstall, install };
}
