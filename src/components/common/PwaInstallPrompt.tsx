import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { APP_CONFIG } from '../../config';
import { THEME } from '../../theme';
import {
  isInstallPromptSnoozed,
  snoozeInstallPrompt,
  usePwaInstall,
} from '../../hooks/usePwaInstall';
import { enableAppPush } from '../../lib/pushNotifications';
import { pingInstalledApp } from '../../lib/appInstallPing';

/** Aparece só depois que a pessoa rola a página, perto do rodapé. */
const SCROLL_RATIO_TO_SHOW = 0.45;

/** Sobe acima do rodapé fixo de inscrição, presente até o breakpoint lg. */
const POSITION =
  'fixed z-[90] left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-6 sm:w-[21rem] lg:bottom-6';

export function PwaInstallPrompt() {
  const { canInstall, install } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canInstall || isInstallPromptSnoozed()) {
      setVisible(false);
      return;
    }

    const check = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const ratio = scrolled / Math.max(document.body.scrollHeight, 1);
      if (ratio >= SCROLL_RATIO_TO_SHOW) {
        setVisible(true);
        window.removeEventListener('scroll', check);
      }
    };

    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => window.removeEventListener('scroll', check);
  }, [canInstall]);

  const dismiss = () => {
    snoozeInstallPrompt();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && canInstall ? (
        <motion.div
          role="dialog"
          aria-label="Instalar App Delphos"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{
            duration: THEME.motion.duration,
            ease: THEME.motion.ease,
          }}
          className={POSITION}
        >
          <div className="relative rounded-3xl border border-gray-100 bg-white/95 backdrop-blur-md p-4 pr-10 shadow-2xl shadow-black/10">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dispensar convite de instalação"
              className="absolute top-2.5 right-2.5 w-8 h-8 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <X size={16} aria-hidden="true" />
            </button>

            <div className="flex items-start gap-3">
              <span className="w-11 h-11 shrink-0 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/25">
                <Download size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-black text-gray-900 text-sm leading-tight">
                  Levar o {APP_CONFIG.name} na tela inicial?
                </p>
                <p className="text-gray-500 text-xs leading-relaxed mt-1">
                  Abre rápido, direto do aparelho, e você acompanha seus
                  ingressos com um toque.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      void enableAppPush();
                      void install().then((accepted) => {
                        setVisible(false);
                        if (accepted) void pingInstalledApp();
                      });
                    }}
                  >
                    Instalar
                  </Button>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-900 transition-colors px-2 py-2"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
