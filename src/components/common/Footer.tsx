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
    <footer className="bg-[#061c37] pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6 sm:pb-6">
      <div className="page-container">
        <div className="w-full h-px bg-white/20 mb-4" />

        <div className="flex flex-col items-center gap-3 sm:gap-3.5">
          <nav
            aria-label="Institucional"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5"
          >
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-accent-gold"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <nav
            aria-label="Acesso"
            className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-6"
          >
            <Link
              to={ROUTES.PUBLIC.ORDER_LOOKUP}
              className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-accent-gold"
            >
              Já comprou? Receber ingressos
            </Link>
            <Link
              to={ROUTES.ADMIN.DASHBOARD}
              className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-accent-gold"
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
                className="inline-flex items-center gap-1.5 text-white/90 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-accent-gold"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Instalar App Delphos
              </button>
            )}
          </nav>

          <div className="text-center space-y-1 max-w-lg">
            <p className="text-white text-[11px] tracking-wide leading-snug">
              © {new Date().getFullYear()} {APP_CONFIG.name} • Todos os direitos
              reservados.
            </p>
            <p className="text-white text-[11px] leading-snug">
              {ORG.razaoSocial} · CNPJ {ORG.cnpj}
              <br />
              {orgAddressLine()}
            </p>
            <p className="text-white text-[10px] tracking-wider uppercase font-medium leading-snug">
              Este site foi desenvolvido por{' '}
              <a
                href="https://hervenhub.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-gold font-black hover:underline"
              >
                Herven Hub
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
