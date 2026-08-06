import { motion } from 'motion/react';
import { THEME } from '../../theme';

export interface Collaborator {
  id: string;
  name: string;
  logo: string;
  url?: string;
}

const COLLABORATORS: Collaborator[] = [
  {
    id: 'ameo',
    name: 'AMEO — Associação da Medula Óssea',
    logo: '/collaborators/ameo.png',
  },
];

export function Collaborators() {
  if (COLLABORATORS.length === 0) return null;

  return (
    <section
      aria-label="Colaboradores"
      className="relative z-10 -mb-6 sm:-mb-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
        className="card-surface px-6 py-8 sm:px-10 sm:py-10 shadow-[var(--shadow-card-hover)] ring-1 ring-brand/5"
      >
        <div className="text-center mb-8 sm:mb-10">
          <p className="label-micro mb-2 text-brand">Parcerias</p>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Colaboradores
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Instituições que caminham conosco nesta causa.
          </p>
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {COLLABORATORS.map((collaborator) => {
            const content = (
              <span className="group flex items-center justify-center h-20 sm:h-24 w-[160px] sm:w-[200px] rounded-2xl bg-white border border-gray-100 px-5 transition-all hover:border-brand/20 hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5">
                <img
                  src={collaborator.logo}
                  alt={collaborator.name}
                  loading="lazy"
                  className="max-h-14 sm:max-h-16 w-auto max-w-full object-contain"
                />
              </span>
            );

            return (
              <li key={collaborator.id}>
                {collaborator.url ? (
                  <a
                    href={collaborator.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={collaborator.name}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-2xl"
                  >
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </motion.div>
    </section>
  );
}
