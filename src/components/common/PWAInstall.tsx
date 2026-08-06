import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { APP_CONFIG } from '../../config';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstall: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-[100]"
        >
          <div className="card-surface p-5 flex items-center gap-4 shadow-2xl">
            <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand/25">
              <Download size={28} aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-900 text-base leading-tight">
                Instalar {APP_CONFIG.name}
              </h3>
              <p className="text-gray-500 text-sm font-medium mt-0.5">
                Acesso rápido direto da tela inicial.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Button size="sm" onClick={handleInstallClick}>
                  Instalar
                </Button>
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  className="text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-gray-900"
                >
                  Agora não
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
