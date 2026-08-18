import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { isPwaInstalled } from '../../hooks/usePwaInstall';
import {
  canUseWebPush,
  enableInstalledAppPush,
  syncInstalledPushSubscription,
} from '../../lib/pushNotifications';
import { Button } from '../ui/Button';

/** Só aparece no app instalado, para ligar os avisos de eventos novos. */
export function PushEnablePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isPwaInstalled() || !canUseWebPush()) return;

    if (Notification.permission === 'granted') {
      void syncInstalledPushSubscription();
      return;
    }

    if (Notification.permission === 'default') {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed z-[85] left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-6 sm:w-[21rem] lg:bottom-6">
      <div className="rounded-3xl border border-gray-100 bg-white/95 backdrop-blur-md p-4 shadow-2xl shadow-black/10">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-brand text-white flex items-center justify-center">
            <Bell size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-black text-gray-900 text-sm leading-tight">
              Avisar quando sair um evento novo?
            </p>
            <p className="text-gray-500 text-xs leading-relaxed mt-1">
              Toque em Ativar avisos neste app instalado. Sem isso o celular
              não recebe o aviso de evento novo.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => {
                  void enableInstalledAppPush().then((ok) => {
                    if (ok) setShow(false);
                  });
                }}
              >
                Ativar avisos
              </Button>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-900 transition-colors px-2 py-2"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
