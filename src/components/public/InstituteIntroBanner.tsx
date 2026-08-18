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

/** Banner institucional compacto: emblema original à esquerda e texto nítido à direita. */
export function InstituteIntroBanner() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <section aria-label="Instituto Delphos" className="w-full max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: THEME.motion.ease }}
          className="group relative"
        >
          <div
            className="absolute -inset-2 sm:-inset-3 rounded-[1.75rem] bg-brand/20 blur-xl opacity-40 transition-opacity duration-500 group-hover:opacity-70"
            aria-hidden="true"
          />

          <div className="relative flex items-center overflow-hidden rounded-2xl sm:rounded-[1.35rem] bg-gradient-to-r from-[#2743c0] via-[#16306e] to-[#070910] shadow-[0_18px_48px_-20px_rgba(5,21,41,0.75)] ring-1 ring-white/10">
            <img
              src="/delphos-emblem.png"
              alt=""
              width={194}
              height={213}
              className="h-[5.5rem] sm:h-[6.75rem] w-auto shrink-0 object-contain object-left select-none ml-2 sm:ml-3 my-2"
            />

            <div className="min-w-0 flex-1 flex flex-col items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 text-center">
              <p className="text-white font-black tracking-[0.14em] sm:tracking-[0.2em] uppercase text-[11px] sm:text-sm leading-tight">
                Instituto Delphos
              </p>
              <p className="text-white/85 font-semibold text-[9px] sm:text-[11px] leading-snug max-w-[22rem]">
                Conectando Pessoas, Transformando Solidariedade em Ação
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-0.5 inline-flex items-center justify-center rounded-md bg-[#2a52d6] hover:bg-[#3b63e8] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] px-3.5 sm:px-4 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Saiba mais
              </button>
            </div>
          </div>
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
