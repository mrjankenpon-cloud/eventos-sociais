import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion } from 'motion/react';
import { X, Zap, ZapOff, RefreshCcw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string | null>(null);
  const lastScanAtRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    []
  );
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const stopScanner = useCallback(async () => {
    if (qrCodeRef.current?.isScanning) {
      try {
        await qrCodeRef.current.stop();
        qrCodeRef.current = null;
      } catch (err) {
        console.error('Erro ao parar scanner:', err);
      }
    }
  }, []);

  const cameraErrorMessage = (err: unknown): string => {
    const name =
      err && typeof err === 'object' && 'name' in err
        ? String((err as { name?: string }).name)
        : '';
    const raw = err instanceof Error ? err.message : 'Erro desconhecido';
    const lower = `${name} ${raw}`.toLowerCase();

    if (
      name === 'NotAllowedError' ||
      lower.includes('permission') ||
      lower.includes('notallowed')
    ) {
      return 'Permissão da câmera negada. Libere o acesso à câmera no navegador e tente de novo.';
    }
    if (
      name === 'NotFoundError' ||
      lower.includes('requested device not found') ||
      lower.includes('notfound')
    ) {
      return 'Nenhuma câmera disponível neste dispositivo.';
    }
    if (
      name === 'NotReadableError' ||
      lower.includes('could not start video source') ||
      lower.includes('notreadable')
    ) {
      return 'A câmera está em uso por outro aplicativo. Feche-o e tente de novo.';
    }
    if (
      name === 'OverconstrainedError' ||
      lower.includes('overconstrained')
    ) {
      return 'Esta webcam não aceitou as configurações do scanner. Tente novamente ou use outro navegador.';
    }
    if (
      lower.includes('secure') ||
      lower.includes('https') ||
      lower.includes('getusermedia')
    ) {
      return 'A câmera só funciona em conexão segura (HTTPS) ou em localhost.';
    }
    return `Não foi possível abrir a câmera: ${raw}`;
  };

  const fitCameraFeed = useCallback(() => {
    const root = document.getElementById('qr-reader');
    if (!root) return;

    root.style.setProperty('position', 'absolute', 'important');
    root.style.setProperty('inset', '0', 'important');
    root.style.setProperty('width', '100%', 'important');
    root.style.setProperty('height', '100%', 'important');
    root.style.setProperty('min-width', '100%', 'important');
    root.style.setProperty('min-height', '100%', 'important');
    root.style.setProperty('padding', '0', 'important');
    root.style.setProperty('margin', '0', 'important');
    root.style.setProperty('border', 'none', 'important');
    root.style.setProperty('overflow', 'hidden', 'important');

    const region = root.querySelector('#qr-reader__scan_region');
    if (region instanceof HTMLElement) {
      region.style.setProperty('position', 'absolute', 'important');
      region.style.setProperty('inset', '0', 'important');
      region.style.setProperty('width', '100%', 'important');
      region.style.setProperty('height', '100%', 'important');
      region.style.setProperty('min-width', '100%', 'important');
      region.style.setProperty('min-height', '100%', 'important');
      region.style.setProperty('display', 'block', 'important');
      region.style.setProperty('overflow', 'hidden', 'important');
      region.style.setProperty('padding', '0', 'important');
      region.style.setProperty('margin', '0', 'important');
    }

    const fillMedia = (el: HTMLElement) => {
      el.style.setProperty('position', 'absolute', 'important');
      el.style.setProperty('inset', '0', 'important');
      el.style.setProperty('width', '100%', 'important');
      el.style.setProperty('height', '100%', 'important');
      el.style.setProperty('max-width', 'none', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('min-width', '100%', 'important');
      el.style.setProperty('min-height', '100%', 'important');
      el.style.setProperty('object-fit', 'cover', 'important');
      el.style.setProperty('object-position', 'center center', 'important');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('border', 'none', 'important');
      el.style.setProperty('border-radius', '0', 'important');
    };

    const video = root.querySelector('video');
    if (video instanceof HTMLVideoElement) fillMedia(video);

    root.querySelectorAll('canvas').forEach((canvas) => {
      if (canvas instanceof HTMLCanvasElement) fillMedia(canvas);
    });
  }, []);

  const startScanner = useCallback(
    async (cameraId: string) => {
      if (qrCodeRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      qrCodeRef.current = html5QrCode;

      const config = {
        fps: 12,
        // Large scan window so tickets are easier to capture without getting too close.
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(240, Math.floor(edge * 0.9));
          return { width: size, height: size };
        },
        aspectRatio: 1,
      };

      const onDecoded = (decodedText: string) => {
        const now = Date.now();
        if (
          decodedText === lastScanRef.current &&
          now - lastScanAtRef.current < 2500
        ) {
          return;
        }
        lastScanRef.current = decodedText;
        lastScanAtRef.current = now;
        onScanRef.current(decodedText);
      };

      try {
        // Prefer device id string — most compatible with laptop webcams.
        try {
          await html5QrCode.start(cameraId, config, onDecoded, () => {});
        } catch (firstErr) {
          // Some browsers reject the first attempt; retry with soft constraints.
          await html5QrCode.start(
            { deviceId: { exact: cameraId } },
            {
              fps: 10,
              qrbox: config.qrbox,
            },
            onDecoded,
            () => {}
          );
        }

        fitCameraFeed();
        // Library reapplies inline sizes after metadata / first frames on mobile.
        requestAnimationFrame(fitCameraFeed);
        window.setTimeout(fitCameraFeed, 120);
        window.setTimeout(fitCameraFeed, 400);
        const video = document.querySelector('#qr-reader video');
        if (video instanceof HTMLVideoElement) {
          video.addEventListener('loadedmetadata', fitCameraFeed, {
            once: true,
          });
          video.addEventListener('playing', fitCameraFeed, { once: true });
        }

        const state = html5QrCode.getRunningTrackCapabilities();
        setHasFlash(Boolean(state && (state as { torch?: boolean }).torch));
      } catch (err: unknown) {
        setError(cameraErrorMessage(err));
      }
    },
    [fitCameraFeed, stopScanner]
  );

  useEffect(() => {
    const initializeScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices.map((d) => ({ id: d.id, label: d.label })));
          const backCamera = devices.find((device) => {
            const label = device.label.toLowerCase();
            return (
              label.includes('back') ||
              label.includes('traseira') ||
              label.includes('rear')
            );
          });
          const initialCameraId = backCamera ? backCamera.id : devices[0].id;
          setCurrentCameraId(initialCameraId);
          await startScanner(initialCameraId);
        } else {
          setError('Nenhuma câmera encontrada.');
        }
      } catch (err: unknown) {
        setError(cameraErrorMessage(err));
      } finally {
        setIsInitializing(false);
      }
    };

    initializeScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const switchCamera = async () => {
    if (cameras.length < 2 || !currentCameraId) return;
    const currentIndex = cameras.findIndex((c) => c.id === currentCameraId);
    const nextCameraId = cameras[(currentIndex + 1) % cameras.length].id;
    setCurrentCameraId(nextCameraId);
    await startScanner(nextCameraId);
  };

  const toggleFlash = async () => {
    if (!qrCodeRef.current || !hasFlash) return;
    try {
      const newFlashState = !isFlashOn;
      await qrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: newFlashState } as MediaTrackConstraintSet & {
          torch?: boolean;
        }],
      });
      setIsFlashOn(newFlashState);
    } catch (err) {
      console.error('Erro ao alternar flash:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-brand-deeper flex flex-col items-center overflow-hidden px-1 pt-2 pb-2 sm:p-4 sm:justify-center"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Scanner de QR Code"
    >
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar scanner"
          className="p-2.5 sm:p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-xl border border-white/10"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="w-full max-w-none sm:max-w-md flex flex-col items-center gap-2.5 sm:gap-8 flex-1 sm:flex-none min-h-0 justify-center">
        <div className="text-center shrink-0 px-8 sm:px-0">
          <h2 className="text-lg sm:text-3xl font-black text-white tracking-tight">
            Check-in Digital
          </h2>
          <p className="text-white/40 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] mt-0.5 sm:mt-2">
            Cada QR = 1 ingresso · escaneie individualmente
          </p>
        </div>

        {/* Near full-bleed on mobile: use almost all width and remaining viewport height. */}
        <div
          className="relative mx-auto aspect-square bg-black rounded-2xl sm:rounded-[48px] overflow-hidden border border-white/5 shadow-2xl shrink-0 w-[min(98vw,calc(100dvh-9.5rem),560px)] sm:w-[min(100%,72vw,420px)]"
        >
          <div id="qr-reader" className="absolute inset-0 w-full h-full" />

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[90%] sm:w-[72%] aspect-square border-2 border-brand/50 rounded-2xl sm:rounded-[32px] relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-brand rounded-tl-2xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-brand rounded-tr-2xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-brand rounded-bl-2xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-brand rounded-br-2xl" />
            </div>
          </div>

          {isInitializing && (
            <div className="absolute inset-0 bg-brand-deeper flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-white/10 border-t-brand rounded-full animate-spin" />
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                Iniciando câmera...
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 shrink-0 min-h-[2.75rem]">
          {hasFlash && (
            <button
              type="button"
              onClick={toggleFlash}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                isFlashOn
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-white/5 text-white border-white/10'
              }`}
            >
              {isFlashOn ? <Zap size={16} /> : <ZapOff size={16} />}
              {isFlashOn ? 'Flash ligado' : 'Flash'}
            </button>
          )}

          {cameras.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10"
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Alternar
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-100 p-4 sm:p-5 rounded-2xl text-center flex flex-col items-center gap-3 border border-red-500/30 w-full max-w-sm">
            <AlertCircle size={22} className="text-red-300" aria-hidden="true" />
            <p className="text-[11px] font-bold leading-relaxed">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null);
                setIsInitializing(true);
                if (currentCameraId) {
                  startScanner(currentCameraId).finally(() =>
                    setIsInitializing(false)
                  );
                } else {
                  window.location.reload();
                }
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
