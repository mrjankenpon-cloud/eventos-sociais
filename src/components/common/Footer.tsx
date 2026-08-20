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

const linkClass =
  'text-white/85 hover:text-accent-gold text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] sm:tracking-[0.16em] py-1 px-0.5 transition-colors';

export default function Footer() {
  const { canInstall, install } = usePwaInstall();

  return (
    <footer className="shrink-0 bg-[#061c37] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pt-3.5 md:pt-4 md:pb-4">
      <div className="page-container">
        <div className="w-full h-px bg-white/15 mb-2.5 sm:mb-3" />

        <div className="flex flex-col items-center gap-2 sm:gap-2.5">
          <nav
            aria-label="Institucional"
            className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1"
          >
            {LEGAL_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </Link>
            ))}
          </nav>

          <nav
            aria-label="Acesso"
            className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1"
          >
            <Link to={ROUTES.PUBLIC.ORDER_LOOKUP} className={linkClass}>
              Já comprou? Receber ingressos
            </Link>
            <Link to={ROUTES.ADMIN.DASHBOARD} className={linkClass}>
              Área Restrita
            </Link>
            {canInstall && (
              <button
                type="button"
                onClick={() => {
                  void enableAppPush();
                  void install();
                }}
                className={`inline-flex items-center gap-1 ${linkClass}`}
              >
                <Download className="w-3 h-3" aria-hidden="true" />
                Instalar App Delphos
              </button>
            )}
          </nav>

          <div className="text-center max-w-xl space-y-0.5 px-2">
            <p className="text-white/70 text-[9px] sm:text-[10px] tracking-wide leading-snug">
              © {new Date().getFullYear()} {APP_CONFIG.name} ·{' '}
              {ORG.razaoSocial} · CNPJ {ORG.cnpj}
            </p>
            <p className="text-white/55 text-[9px] sm:text-[10px] leading-snug">
              {orgAddressLine()}
            </p>
            <p className="text-white/45 text-[8px] sm:text-[9px] tracking-wider uppercase font-medium leading-snug">
              Desenvolvido por{' '}
              <a
                href="https://hervenhub.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="font-black hover:underline"
                style={{ color: '#F5C400' }}
              >
                Herven Hub
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
