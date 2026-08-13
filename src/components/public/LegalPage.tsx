import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../config';

export function LegalPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="pb-16 sm:pb-24 min-h-[60vh] bg-surface-muted">
      <div className="page-container max-w-3xl pt-8 sm:pt-12">
        <Link
          to={ROUTES.PUBLIC.HOME}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-brand mb-6 transition-colors font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Voltar à home
        </Link>

        <article className="card-surface overflow-hidden">
          <header className="bg-brand p-6 sm:p-8 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70 mb-2">
              Instituto Delphos
            </p>
            <h1 className="text-2xl sm:text-3xl font-black">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-white/80 text-sm sm:text-base leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </header>
          <div className="p-6 sm:p-8 md:p-10 space-y-8 text-sm sm:text-[15px] text-gray-600 leading-relaxed">
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
