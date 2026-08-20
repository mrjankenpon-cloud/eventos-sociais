import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { isPwaInstalled } from '../../hooks/usePwaInstall';
import {
  canUseWebPush,
  enableAppPush,
  syncInstalledPushSubscription,
} from '../../lib/pushNotifications';
import { getScrollMetrics, onPageScroll } from '../../lib/pageScroll';
import { Button } from '../ui/Button';

const SNOOZE_KEY = 'delphos:push-prompt-snooze';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** Esconde o card perto do fim para o rodapé ficar clicável. */
const HIDE_NEAR_FOOTER_RATIO = 0.82;

function isPushPromptSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snoozePushPrompt() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Só no app instalado. Overlay fixo fora do fluxo do documento
 * (evita empurrar/piscar o rodapé na home do atalho).
 */
export function PushEnablePrompt() {
  const [show, setShow] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);

  useEffect(() => {
    if (!isPwaInstalled() || !canUseWebPush()) return;
    if (isPushPromptSnoozed()) return;

    if (Notification.permission === 'granted') {
      void syncInstalledPushSubscription();
      return;
    }

    const timer = window.setTimeout(() => {
      if (Notification.permission === 'denied') {
        setBlocked(true);
        setShow(true);
        return;
      }
      if (Notification.permission === 'default') {
        setShow(true);
      }
    }, 1800);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!show) return;

    const check = () => {
      const { top, view, height } = getScrollMetrics();
      const ratio = (top + view) / Math.max(height, 1);
      setNearFooter(ratio >= HIDE_NEAR_FOOTER_RATIO);
    };

    check();
    return onPageScroll(check, { passive: true });
  }, [show]);

  if (!show || nearFooter) return null;

  const dismiss = () => {
    snoozePushPrompt();
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Ativar avisos de eventos"
      className="fixed z-[90] left-3 right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:left-auto sm:right-6 sm:w-[21rem]"
    >
      <div className="rounded-3xl border border-gray-100 bg-white/95 backdrop-blur-md p-4 shadow-2xl shadow-black/10">
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
                        snoozePushPrompt();
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
                onClick={dismiss}
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
