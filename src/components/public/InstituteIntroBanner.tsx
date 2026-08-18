import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ROUTES } from '../../config';
import { THEME } from '../../theme';

const ABOUT_SUMMARY =
  'O Instituto Delphos nasce com o propósito de transformar valores como fraternidade e responsabilidade social em ações concretas para quem mais precisa. Nosso foco é promover eventos beneficentes, mobilizar doações e arrecadar recursos para apoiar e fortalecer projetos de instituições parceiras que já realizam trabalhos de grande impacto na comunidade. Atuando de forma voluntária e coletiva, conectamos pessoas, famílias e empresas a causas nobres, garantindo que a união por um objetivo comum gere resultados reais para a sociedade.';

/** Banner institucional flutuante entre as instituições e os destaques de evento. */
export function InstituteIntroBanner() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <section aria-label="Instituto Delphos" className="w-full max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: THEME.motion.ease }}
          className="group relative"
        >
          <div
            className="absolute -inset-3 sm:-inset-4 rounded-[2rem] sm:rounded-[2.5rem] bg-brand/25 blur-2xl opacity-40 transition-opacity duration-500 group-hover:opacity-70"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative block w-full overflow-hidden rounded-[1.35rem] sm:rounded-[1.85rem] bg-[#050510] shadow-[0_24px_64px_-24px_rgba(5,21,41,0.7)] ring-1 ring-white/10 transition-transform duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-20px_rgba(22,85,163,0.55)] focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted"
            aria-label="Saiba mais sobre o Instituto Delphos"
          >
            <img
              src="/instituto-banner.png"
              alt=""
              className="block w-full h-auto select-none"
              width={829}
              height={217}
            />
            <span className="sr-only">Saiba mais</span>
          </button>
        </motion.div>
      </section>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Instituto Delphos"
        maxWidth="lg"
      >
        <p className="text-[15px] sm:text-base text-gray-600 leading-relaxed">
          {ABOUT_SUMMARY}
        </p>
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
