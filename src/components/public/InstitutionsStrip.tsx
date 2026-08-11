import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { institutionService } from '../../services/institution.service';
import type { Institution } from '../../types';
import { THEME } from '../../theme';
import { AppImage } from '../ui/AppImage';

function institutionHref(inst: Institution): string | undefined {
  const site = inst.site?.trim();
  if (site) return site.startsWith('http') ? site : `https://${site}`;
  return undefined;
}

export function InstitutionsStrip() {
  const [items, setItems] = useState<Institution[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await institutionService.getActive();
        if (!cancelled) setItems(data);
      } catch (error) {
        console.error('[InstitutionsStrip]', error);
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Instituições"
      className="relative z-20 w-full bg-white border-b border-gray-100 shadow-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
        className="page-container py-4 sm:py-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div className="sm:shrink-0 text-center sm:text-left sm:border-r sm:border-gray-100 sm:pr-8">
            <p className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-brand">
              Instituições
            </p>
          </div>

          <ul className="flex flex-wrap items-center justify-center sm:justify-start gap-5 sm:gap-8 flex-1 min-w-0">
            {items.map((inst) => {
              const href = institutionHref(inst);
              const logo = (
                <span className="inline-flex items-center justify-center h-28 sm:h-32 px-3 sm:px-4 rounded-xl bg-transparent transition-all hover:opacity-90">
                  <AppImage
                    src={inst.logo}
                    alt={inst.nome}
                    loading="lazy"
                    className="h-24 sm:h-28 w-auto max-w-[440px] sm:max-w-[560px] object-contain"
                  />
                </span>
              );

              return (
                <li key={inst.id}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={inst.nome}
                      title={inst.nome}
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-xl"
                    >
                      {logo}
                    </a>
                  ) : (
                    <span title={inst.nome}>{logo}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}
