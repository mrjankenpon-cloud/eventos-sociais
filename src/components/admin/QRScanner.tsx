import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion } from 'motion/react';
import { X, Zap, ZapOff, RefreshCcw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

function viewportSize() {
  const w = Math.round(
    Math.max(
      window.innerWidth,
      window.visualViewport?.width || 0,
      document.documentElement.clientWidth || 0
    )
  );
  const h = Math.round(
    Math.max(
      window.innerHeight,
      window.visualViewport?.height || 0,
      document.documentElement.clientHeight || 0
    )
  );
  return { w: Math.max(w, 320), h: Math.max(h, 480) };
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string | null>(null);
  const lastScanAtRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const fitIntervalRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const readerHostRef = useRef<HTMLDivElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    []
  );
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const stopScanner = useCallback(async () => {
    if (fitIntervalRef.current != null) {
      window.clearInterval(fitIntervalRef.current);
      fitIntervalRef.current = null;
    }
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
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

  /**
   * Force the reader + video to the real phone viewport BEFORE html5-qrcode
   * measures clientWidth on "playing" (it otherwise locks ~300px and only
   * browser zoom makes the preview feel larger).
   */
  const fitCameraFeed = useCallback(() => {
    const { w, h } = viewportSize();
    const root = document.getElementById('qr-reader');
    const host = readerHostRef.current;
    if (!root) return;

    if (host) {
      host.style.width = `${w}px`;
      host.style.height = `${h}px`;
    }

    root.style.setProperty('position', 'absolute', 'important');
    root.style.setProperty('top', '0', 'important');
    root.style.setProperty('left', '0', 'important');
    root.style.setProperty('width', `${w}px`, 'important');
    root.style.setProperty('height', `${h}px`, 'important');
    root.style.setProperty('min-width', `${w}px`, 'important');
    root.style.setProperty('min-height', `${h}px`, 'important');
    root.style.setProperty('max-width', 'none', 'important');
    root.style.setProperty('max-height', 'none', 'important');
    root.style.setProperty('padding', '0', 'important');
    root.style.setProperty('margin', '0', 'important');
    root.style.setProperty('border', 'none', 'important');
    root.style.setProperty('overflow', 'hidden', 'important');
    root.style.setProperty('background', '#000', 'important');

    const applyBox = (el: HTMLElement) => {
      el.style.setProperty('position', 'absolute', 'important');
      el.style.setProperty('top', '0', 'important');
      el.style.setProperty('left', '0', 'important');
      el.style.setProperty('width', `${w}px`, 'important');
      el.style.setProperty('height', `${h}px`, 'important');
      el.style.setProperty('min-width', `${w}px`, 'important');
      el.style.setProperty('min-height', `${h}px`, 'important');
      el.style.setProperty('max-width', 'none', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('object-fit', 'cover', 'important');
      el.style.setProperty('object-position', 'center center', 'important');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('border', 'none', 'important');
      el.style.setProperty('border-radius', '0', 'important');
      el.style.setProperty('display', 'block', 'important');
    };

    const region = root.querySelector('#qr-reader__scan_region');
    if (region instanceof HTMLElement) applyBox(region);

    const video = root.querySelector('video');
    if (video instanceof HTMLVideoElement) {
      video.removeAttribute('width');
      video.removeAttribute('height');
      applyBox(video);
    }

    root.querySelectorAll('canvas').forEach((canvas) => {
      if (canvas instanceof HTMLCanvasElement) {
        canvas.style.setProperty('display', 'none', 'important');
      }
    });

    // Hide library shaded borders — we draw a large reticle ourselves.
    root.querySelectorAll(':scope > div').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.id === 'qr-reader__scan_region') return;
      if (node.querySelector('video')) return;
      node.style.setProperty('display', 'none', 'important');
    });
  }, []);

  const startScanner = useCallback(
    async (cameraId: string) => {
      if (qrCodeRef.current) {
        await stopScanner();
      }

      const readerEl = document.getElementById('qr-reader');
      if (!readerEl) {
        setError('Elemento da câmera não encontrado.');
        return;
      }

      // Pretend the mount is already full-screen before the library measures it.
      fitCameraFeed();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      fitCameraFeed();

      // Expand <video> as soon as it is inserted — must beat the "playing" callback.
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new MutationObserver(() => {
        fitCameraFeed();
      });
      observerRef.current.observe(readerEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'width', 'height'],
      });

      const html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      qrCodeRef.current = html5QrCode;

      const { w, h } = viewportSize();
      const config = {
        fps: 12,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const vw = Math.max(viewfinderWidth, w);
          const vh = Math.max(viewfinderHeight, Math.floor(h * 0.85));
          const edge = Math.min(vw, vh);
          const size = Math.max(280, Math.floor(edge * 0.88));
          return { width: size, height: size };
        },
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
        try {
          await html5QrCode.start(cameraId, config, onDecoded, () => {});
        } catch {
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
        requestAnimationFrame(fitCameraFeed);
        [50, 120, 300, 600, 1200].forEach((ms) => {
          window.setTimeout(fitCameraFeed, ms);
        });

        if (fitIntervalRef.current != null) {
          window.clearInterval(fitIntervalRef.current);
        }
        fitIntervalRef.current = window.setInterval(fitCameraFeed, 700);

        const video = document.querySelector('#qr-reader video');
        if (video instanceof HTMLVideoElement) {
          video.addEventListener('loadedmetadata', fitCameraFeed);
          video.addEventListener('playing', fitCameraFeed);
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
              label.includes('rear') ||
              label.includes('environment')
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

  useEffect(() => {
    const onResize = () => fitCameraFeed();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [fitCameraFeed]);

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
      className="fixed inset-0 z-[100] bg-black"
      style={{
        width: '100vw',
        height: '100dvh',
        maxWidth: '100vw',
        maxHeight: '100dvh',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Scanner de QR Code"
    >
      {/* Full-bleed camera — entire phone screen */}
      <div
        ref={readerHostRef}
        className="absolute inset-0 bg-black overflow-hidden"
        style={{ width: '100vw', height: '100dvh' }}
      >
        <div
          id="qr-reader"
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Large reticle overlay (camera behind stays full screen) */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div
            className="relative border-[3px] border-brand rounded-[28px] shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]"
            style={{
              width: 'min(96vw, 88dvh)',
              height: 'min(96vw, 88dvh)',
              maxWidth: '96vw',
              maxHeight: '88dvh',
            }}
          >
            <div className="absolute -top-1 -left-1 w-12 h-12 border-t-[6px] border-l-[6px] border-brand rounded-tl-3xl" />
            <div className="absolute -top-1 -right-1 w-12 h-12 border-t-[6px] border-r-[6px] border-brand rounded-tr-3xl" />
            <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-[6px] border-l-[6px] border-brand rounded-bl-3xl" />
            <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-[6px] border-r-[6px] border-brand rounded-br-3xl" />
          </div>
        </div>
      </div>

      {/* Top chrome over the feed */}
      <div
        className="absolute top-0 inset-x-0 z-20 flex items-start justify-between gap-3 px-3"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="min-w-0 pt-1">
          <h2 className="text-base sm:text-2xl font-black text-white tracking-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Check-in Digital
          </h2>
          <p className="text-white/80 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            Enquadre o QR do ingresso na moldura
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar scanner"
          className="p-2.5 sm:p-4 bg-black/50 hover:bg-black/65 text-white rounded-full transition-all backdrop-blur-md border border-white/20 shrink-0"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Bottom controls */}
      <div
        className="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center gap-3 px-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-wrap justify-center gap-2">
          {hasFlash && (
            <button
              type="button"
              onClick={toggleFlash}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border backdrop-blur-md ${
                isFlashOn
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-black/50 text-white border-white/20'
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
              className="flex items-center gap-2 px-4 py-2.5 bg-black/50 text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black/65 backdrop-blur-md"
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Alternar
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-600/95 text-white p-4 rounded-2xl text-center flex flex-col items-center gap-3 border border-red-300/40 w-full max-w-sm mb-1">
            <AlertCircle size={22} aria-hidden="true" />
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

      {isInitializing && (
        <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-brand rounded-full animate-spin" />
          <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">
            Iniciando câmera...
          </p>
        </div>
      )}
    </motion.div>
  );
};
