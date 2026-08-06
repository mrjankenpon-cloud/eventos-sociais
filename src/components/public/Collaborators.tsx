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
    url: 'https://ameo.org.br/',
  },
];

export function Collaborators() {
  if (COLLABORATORS.length === 0) return null;

  return (
    <section
      aria-label="Colaboradores"
      className="relative z-20 w-full bg-white border-b border-gray-100 shadow-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
        className="page-container py-2 sm:py-2.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
          <div className="sm:shrink-0 text-center sm:text-left sm:border-r sm:border-gray-100 sm:pr-8">
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-brand">
              Colaboradores
            </p>
          </div>

          <ul className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-7 flex-1 min-w-0">
            {COLLABORATORS.map((collaborator) => {
              const logo = (
                <span className="inline-flex items-center justify-center h-14 sm:h-16 px-2 sm:px-3 rounded-xl bg-transparent transition-all hover:opacity-90">
                  <img
                    src={collaborator.logo}
                    alt={collaborator.name}
                    loading="lazy"
                    className="h-12 sm:h-14 w-auto max-w-[220px] sm:max-w-[280px] object-contain"
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
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-xl"
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
