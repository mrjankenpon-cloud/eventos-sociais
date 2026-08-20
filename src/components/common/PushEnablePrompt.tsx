import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { isPwaInstalled } from '../../hooks/usePwaInstall';
import {
  canUseWebPush,
  enableAppPush,
  syncInstalledPushSubscription,
} from '../../lib/pushNotifications';
import { Button } from '../ui/Button';

/** Só aparece no app instalado, para ligar os avisos de eventos novos. */
export function PushEnablePrompt() {
  const [show, setShow] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!isPwaInstalled() || !canUseWebPush()) return;

    if (Notification.permission === 'granted') {
      void syncInstalledPushSubscription();
      return;
    }

    if (Notification.permission === 'denied') {
      setBlocked(true);
      setShow(true);
      return;
    }

    if (Notification.permission === 'default') {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="px-3 pb-4 pt-1 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-3xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-brand text-white flex items-center justify-center">
            <Bell size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-black text-gray-900 text-sm leading-tight">
              {blocked
                ? 'O Chrome bloqueou os avisos'
                : 'Avisar quando sair um evento novo?'}
            </p>
            <p className="text-gray-500 text-xs leading-relaxed mt-1">
              {blocked
                ? 'Não é o DELPHOS. No Chrome, toque no cadeado ao lado do endereço → Notificações → Permitir. No Android: Ajustes → Apps → DELPHOS → Notificações.'
                : 'Toque em Ativar avisos. Sem isso o celular não recebe o aviso de evento novo.'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {!blocked ? (
                <Button
                  size="sm"
                  onClick={() => {
                    void enableAppPush().then((ok) => {
                      if (ok) {
                        setShow(false);
                        return;
                      }
                      if (Notification.permission === 'denied') setBlocked(true);
                    });
                  }}
                >
                  Ativar avisos
                </Button>
              ) : null}
              <button
                type="button"
                onClick={() => setShow(false)}
                className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-900 transition-colors px-2 py-2"
              >
                {blocked ? 'Entendi' : 'Agora não'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
