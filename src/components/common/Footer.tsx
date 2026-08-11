import { Link } from 'react-router-dom';
import { APP_CONFIG, ROUTES } from '../../config';

export default function Footer() {
  return (
    <footer className="bg-surface-muted pt-14 sm:pt-20 pb-12 sm:pb-16">
      <div className="page-container">
        <div className="w-full h-px bg-gray-200 mb-10 opacity-60" />

        <div className="flex flex-col items-center gap-8">
          <nav aria-label="Rodapé">
            <Link
              to={ROUTES.ADMIN.DASHBOARD}
              className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-brand"
            >
              Área Restrita
            </Link>
          </nav>

          <div className="text-center space-y-2">
            <p className="text-gray-400 text-[11px] tracking-wide">
              © {new Date().getFullYear()} {APP_CONFIG.name} • Todos os direitos reservados.
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
