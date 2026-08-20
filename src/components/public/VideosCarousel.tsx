import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, Video, X } from 'lucide-react';
import { videosService } from '../../services/firebase/videos';
import { cachedPublicQuery } from '../../lib/publicDataCache';
import type { SiteVideo } from '../../types';
import { THEME } from '../../theme';
import {
  parseVideoLink,
  resolveVideoThumbnail,
} from '../../lib/videoLink';
import { lockPageScroll } from '../../lib/pageScroll';

export function VideosCarousel() {
  const [items, setItems] = useState<SiteVideo[]>([]);
  const [active, setActive] = useState<SiteVideo | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await cachedPublicQuery('videos.active', () =>
          videosService.getActive()
        );
        if (!cancelled) setItems(data);
      } catch (error) {
        console.warn('[VideosCarousel]', error);
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const unlock = lockPageScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      unlock();
      document.removeEventListener('keydown', onKey);
    };
  }, [active]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 360);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);

  if (items.length === 0) return null;

  const parsedActive = active ? parseVideoLink(active.url) : null;

  return (
    <>
      <section aria-label="Vídeos" className="pt-4 sm:pt-6">
        <div className="flex items-end justify-between gap-3 mb-4 sm:mb-5">
          <div className="min-w-0">
            <p className="label-micro text-brand mb-1">Galeria</p>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">
              Vídeos
            </h2>
          </div>
          {items.length > 1 ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Vídeos anteriores"
                className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-600 hover:text-brand hover:border-brand/30 transition-colors shadow-sm"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Próximos vídeos"
                className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-600 hover:text-brand hover:border-brand/30 transition-colors shadow-sm"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto overscroll-x-contain touch-pan-x touch-pan-y snap-x snap-mandatory pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((video, index) => {
            const thumb = resolveVideoThumbnail(video);
            return (
              <motion.button
                key={video.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: THEME.motion.duration,
                  ease: THEME.motion.ease,
                  delay: Math.min(index * 0.04, 0.2),
                }}
                onClick={() => setActive(video)}
                className="group relative shrink-0 w-[min(20rem,82vw)] sm:w-[min(22rem,46%)] md:w-[min(24rem,38%)] lg:w-[31%] xl:w-[23.5%] snap-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-2xl"
                aria-label={`Assistir: ${video.titulo}`}
              >
                <span className="relative block aspect-video overflow-hidden rounded-2xl bg-gray-200 shadow-md shadow-black/5">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-brand-deeper/90 text-white/70">
                      <Video size={36} aria-hidden="true" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/95 text-brand flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <Play size={22} className="ml-0.5" fill="currentColor" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="absolute bottom-0 inset-x-0 p-3 sm:p-3.5">
                    <span className="block text-white text-sm font-black leading-snug line-clamp-2">
                      {video.titulo}
                    </span>
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {active && parsedActive ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={active.titulo}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 lg:p-10"
            onClick={() => setActive(null)}
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Fechar vídeo"
              className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 w-11 h-11 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X size={20} aria-hidden="true" />
            </button>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: THEME.motion.duration,
                ease: THEME.motion.ease,
              }}
              className="w-full max-w-4xl xl:max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white font-black text-sm sm:text-base mb-3 px-1">
                {active.titulo}
              </p>
              {parsedActive.embedUrl ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                  <iframe
                    title={active.titulo}
                    src={parsedActive.embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-6 sm:p-8 text-center space-y-4">
                  <p className="text-gray-600 text-sm">
                    Este link abre no navegador ou no aplicativo do provedor.
                  </p>
                  <a
                    href={parsedActive.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-brand text-white font-black text-sm hover:bg-brand-dark transition-colors"
                  >
                    Abrir vídeo
                  </a>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
