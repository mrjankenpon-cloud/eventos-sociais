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

  const fitCameraFeed = useCallback(() => {
    const root = document.getElementById('qr-reader');
    if (!root) return;
    const video = root.querySelector('video');
    if (!(video instanceof HTMLVideoElement)) return;

    video.style.setProperty('position', 'absolute', 'important');
    video.style.setProperty('inset', '0', 'important');
    video.style.setProperty('width', '100%', 'important');
    video.style.setProperty('height', '100%', 'important');
    video.style.setProperty('max-width', 'none', 'important');
    video.style.setProperty('max-height', 'none', 'important');
    video.style.setProperty('object-fit', 'cover', 'important');
    video.style.setProperty('object-position', 'center center', 'important');
    video.style.setProperty('transform', 'none', 'important');

    const region = root.querySelector('#qr-reader__scan_region');
    if (region instanceof HTMLElement) {
      region.style.setProperty('position', 'absolute', 'important');
      region.style.setProperty('inset', '0', 'important');
      region.style.setProperty('width', '100%', 'important');
      region.style.setProperty('height', '100%', 'important');
      region.style.setProperty('overflow', 'hidden', 'important');
    }
  }, []);

  const startScanner = useCallback(
    async (cameraId: string) => {
      if (qrCodeRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      qrCodeRef.current = html5QrCode;

      const config = {
        fps: 12,
        // Keep the scan window proportional to the square viewfinder.
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(200, Math.floor(edge * 0.72));
          return { width: size, height: size };
        },
        aspectRatio: 1,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      };

      try {
        await html5QrCode.start(
          {
            deviceId: { exact: cameraId },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          config,
          (decodedText) => {
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
          },
          () => {
            /* ignore frame errors */
          }
        );

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
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(`Erro ao iniciar scanner: ${msg}`);
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
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(`Erro ao acessar câmera: ${msg}`);
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
      className="fixed inset-0 z-[100] bg-brand-deeper flex flex-col items-center justify-center p-4 overflow-hidden"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Scanner de QR Code"
    >
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar scanner"
          className="p-3 sm:p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-xl border border-white/10"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Check-in Digital
          </h2>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
            Cada QR = 1 ingresso · escaneie individualmente
          </p>
        </div>

        <div className="relative mx-auto w-[min(100%,72vw,420px)] aspect-square bg-black rounded-[40px] sm:rounded-[48px] overflow-hidden border border-white/5 shadow-2xl">
          <div id="qr-reader" className="absolute inset-0" />

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[72%] aspect-square border-2 border-brand/50 rounded-[32px] relative">
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

        <div className="flex flex-wrap justify-center gap-3">
          {hasFlash && (
            <button
              type="button"
              onClick={toggleFlash}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
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
              className="flex items-center gap-2 px-5 py-3 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10"
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Alternar
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-100 p-5 rounded-2xl text-center flex flex-col items-center gap-3 border border-red-500/30">
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
