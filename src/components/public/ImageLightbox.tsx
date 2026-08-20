import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppImage } from '../ui/AppImage';
import { THEME } from '../../theme';
import { lockPageScroll } from '../../lib/pageScroll';

interface ImageLightboxProps {
  images: string[];
  /** Índice aberto; null fecha o visualizador. */
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  alt?: (index: number) => string;
}

/** Foto inteira (sem corte) em pop-up, com scroll se a imagem for alta. */
export function ImageLightbox({
  images,
  index,
  onClose,
  onNavigate,
  alt,
}: ImageLightboxProps) {
  const isOpen = index !== null && index >= 0 && index < images.length;
  const total = images.length;

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      onNavigate((next + total) % total);
    },
    [onNavigate, total]
  );

  useEffect(() => {
    if (!isOpen) return;

    const unlock = lockPageScroll();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' && index !== null) {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === 'ArrowLeft' && index !== null) {
        e.preventDefault();
        goTo(index - 1);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      unlock();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, index, goTo, onClose]);

  return (
    <AnimatePresence>
      {isOpen && index !== null ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Foto do evento"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm overflow-y-auto overscroll-contain"
          onClick={onClose}
        >
          <div className="relative flex min-h-full items-center justify-center p-4 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar foto"
              className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-3 sm:right-5 z-10 w-11 h-11 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X size={20} aria-hidden="true" />
            </button>

            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(index - 1);
                  }}
                  aria-label="Foto anterior"
                  className="fixed left-2 sm:left-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <ChevronLeft size={22} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(index + 1);
                  }}
                  aria-label="Próxima foto"
                  className="fixed right-2 sm:right-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <ChevronRight size={22} aria-hidden="true" />
                </button>
              </>
            ) : null}

            <motion.figure
              key={index}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: THEME.motion.duration,
                ease: THEME.motion.ease,
              }}
              className="m-0 flex w-full max-w-[min(92vw,1100px)] flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <AppImage
                src={images[index]}
                alt={alt ? alt(index) : `Foto ${index + 1}`}
                className="h-auto w-auto max-w-full object-contain rounded-xl sm:rounded-2xl shadow-2xl"
                fallbackClassName="w-[70vw] h-[40vh] bg-white/10"
              />
              {total > 1 ? (
                <figcaption className="text-white/70 text-xs font-black uppercase tracking-widest tabular-nums">
                  {index + 1} / {total}
                </figcaption>
              ) : null}
            </motion.figure>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
