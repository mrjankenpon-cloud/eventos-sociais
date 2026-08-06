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
        className="page-container py-3.5 sm:py-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="sm:shrink-0 text-center sm:text-left sm:border-r sm:border-gray-100 sm:pr-6">
            <p className="label-micro text-brand">Colaboradores</p>
          </div>

          <ul className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-5 flex-1 min-w-0">
            {COLLABORATORS.map((collaborator) => {
              const logo = (
                <span className="inline-flex items-center justify-center h-11 sm:h-12 px-3 sm:px-4 rounded-xl bg-surface-muted/80 border border-gray-100 transition-all hover:border-brand/20 hover:bg-white">
                  <img
                    src={collaborator.logo}
                    alt={collaborator.name}
                    loading="lazy"
                    className="max-h-8 sm:max-h-9 w-auto max-w-[130px] sm:max-w-[160px] object-contain"
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
