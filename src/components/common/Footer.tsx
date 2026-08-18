import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { APP_CONFIG, ROUTES } from '../../config';
import { ORG, orgAddressLine } from '../../lib/orgInfo';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { enableAppPush } from '../../lib/pushNotifications';

const LEGAL_LINKS = [
  { to: ROUTES.PUBLIC.ABOUT, label: 'Sobre' },
  { to: ROUTES.PUBLIC.TERMS, label: 'Termo de Uso' },
  { to: ROUTES.PUBLIC.PRIVACY, label: 'Privacidade' },
  { to: ROUTES.PUBLIC.DONATIONS, label: 'Doações' },
] as const;

export default function Footer() {
  const { canInstall, install } = usePwaInstall();

  return (
    <footer className="bg-surface-muted pt-10 sm:pt-20 pb-[max(3rem,env(safe-area-inset-bottom))] sm:pb-16">
      <div className="page-container">
        <div className="w-full h-px bg-gray-200 mb-10 opacity-60" />

        <div className="flex flex-col items-center gap-8">
          <nav
            aria-label="Institucional"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <nav
            aria-label="Acesso"
            className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8"
          >
            <Link
              to={ROUTES.PUBLIC.ORDER_LOOKUP}
              className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-brand"
            >
              Já comprou? Receber ingressos
            </Link>
            <Link
              to={ROUTES.ADMIN.DASHBOARD}
              className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-brand"
            >
              Área Restrita
            </Link>
            {canInstall && (
              <button
                type="button"
                onClick={() => {
                  void enableAppPush();
                  void install();
                }}
                className="inline-flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-brand"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Instalar App Delphos
              </button>
            )}
          </nav>

          <div className="text-center space-y-2 max-w-lg">
            <p className="text-gray-400 text-[11px] tracking-wide">
              © {new Date().getFullYear()} {APP_CONFIG.name} • Todos os direitos
              reservados.
            </p>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              {ORG.razaoSocial} · CNPJ {ORG.cnpj}
              <br />
              {orgAddressLine()}
            </p>
            <p className="text-gray-300 text-[10px] tracking-wider uppercase font-medium">
              Este site foi desenvolvido por{' '}
              <span className="text-gray-400">Herven Hub</span>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
