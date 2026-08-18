import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ROUTES } from '../../config';
import { THEME } from '../../theme';
import { cn } from '../../lib/utils';
import { useSiteContent } from '../../hooks/useSiteContent';
import { RichContent } from './RichContent';

/** Banner institucional flutuante, com o degradê e a tipografia do cabeçalho. */
export function InstituteIntroBanner() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { content } = useSiteContent();
  const saibaMais = content.saibaMais;

  return (
    <>
      <section
        id="saiba-mais"
        aria-label="Instituto Delphos"
        className="w-full"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: THEME.motion.ease }}
          className="group relative"
        >
          <div
            className="absolute -inset-3 rounded-[2rem] bg-brand/30 blur-2xl opacity-30 transition-opacity duration-500 group-hover:opacity-55"
            aria-hidden="true"
          />

          <div
            className={cn(
              'relative overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] shadow-[0_28px_64px_-28px_rgba(5,21,41,0.85)] ring-1 ring-white/10',
              THEME.gradient.header
            )}
          >
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_right,_rgba(255,255,255,0.08),_transparent_70%)]"
              aria-hidden="true"
            />

            <div className="relative grid grid-cols-1 sm:grid-cols-2 items-center gap-5 sm:gap-0 px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
              <div className="text-center sm:text-left sm:pr-10 sm:border-r sm:border-white/15">
                <p className="text-white/80 font-medium tracking-[0.28em] uppercase text-[10px] sm:text-xs">
                  {saibaMais.kicker}
                </p>
                <h2 className="mt-1.5 text-white font-bold tracking-[0.28em] sm:tracking-[0.34em] uppercase text-2xl sm:text-[1.75rem] leading-none">
                  {saibaMais.title}
                </h2>
                <span
                  className="mt-4 mx-auto sm:mx-0 block h-px w-12 bg-accent-gold/80"
                  aria-hidden="true"
                />
              </div>

              <div className="flex flex-col items-center sm:items-start justify-center gap-3 sm:pl-10 text-center sm:text-left">
                <p className="text-white/80 font-medium text-sm leading-relaxed max-w-sm">
                  {saibaMais.tagline}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center justify-center rounded-full bg-white/12 hover:bg-white text-white hover:text-brand-dark border border-white/20 hover:border-transparent px-6 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  Saiba mais
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={saibaMais.modalTitle}
        maxWidth="lg"
      >
        <RichContent html={saibaMais.html} />
        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button
            className="w-full sm:w-auto rounded-2xl"
            onClick={() => {
              setOpen(false);
              navigate(ROUTES.PUBLIC.ABOUT);
            }}
          >
            Conhecer o Instituto
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </Modal>
    </>
  );
}
