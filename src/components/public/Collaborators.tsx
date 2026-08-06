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
    <section aria-label="Colaboradores" className="relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
        className="card-surface px-5 py-5 sm:px-8 sm:py-6 shadow-[var(--shadow-card)] ring-1 ring-brand/5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          <div className="sm:min-w-[160px] sm:shrink-0 text-center sm:text-left sm:border-r sm:border-gray-100 sm:pr-8">
            <p className="label-micro mb-1 text-brand">Parcerias</p>
            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
              Colaboradores
            </h2>
          </div>

          <ul className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 flex-1">
            {COLLABORATORS.map((collaborator) => {
              const logo = (
                <span className="inline-flex items-center justify-center h-14 sm:h-16 px-4 sm:px-5 rounded-2xl bg-white border border-gray-100 transition-all hover:border-brand/20 hover:shadow-sm hover:-translate-y-0.5">
                  <img
                    src={collaborator.logo}
                    alt={collaborator.name}
                    loading="lazy"
                    className="max-h-10 sm:max-h-12 w-auto max-w-[140px] sm:max-w-[180px] object-contain"
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
                      {logo}
                    </a>
                  ) : (
                    logo
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
