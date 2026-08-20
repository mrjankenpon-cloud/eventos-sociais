import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../config';

export function LegalPage({
  title,
  subtitle,
  children,
}: {
  /** Opcional: quando o conteúdo já traz o próprio título (editor). */
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="pb-8 sm:pb-12 lg:pb-16 min-h-[50vh] bg-surface-muted">
      <div className="page-container-readable pt-6 sm:pt-10 lg:pt-14">
        <Link
          to={ROUTES.PUBLIC.HOME}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-brand mb-6 transition-colors font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Voltar à home
        </Link>

        <article className="card-surface overflow-hidden">
          <header className="bg-brand px-5 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-7 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
              Instituto Delphos
            </p>
            {title ? (
              <h1 className="mt-2 text-2xl sm:text-3xl font-black">{title}</h1>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-white/80 text-sm sm:text-base leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </header>
          <div className="p-4 sm:p-8 md:p-10 lg:p-12 space-y-8 text-sm sm:text-[15px] text-gray-600 leading-relaxed">
            {children}
          </div>
        </article>
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base sm:text-lg font-black text-gray-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
