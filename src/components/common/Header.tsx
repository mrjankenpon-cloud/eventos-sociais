import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG, ROUTES } from '../../config';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('header-compact', isScrolled);
    return () => document.documentElement.classList.remove('header-compact');
  }, [isScrolled]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'shadow-2xl shadow-black/40' : ''
      } bg-gradient-to-r from-brand from-0% via-brand via-[28%] via-brand-dark via-[50%] via-brand-deeper via-[75%] to-[#050505]`}
      style={{
        height: 'calc(var(--header-height) + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="page-container relative h-full flex items-center justify-between gap-3 sm:gap-6 min-w-0">
        <Link
          to="/"
          className="group min-w-0 flex flex-col justify-center focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg py-1"
          aria-label={`${APP_CONFIG.name} — início`}
        >
          <span
            className={`text-white/90 font-medium tracking-[0.12em] uppercase transition-all duration-500 group-hover:text-white ${
              isScrolled ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'
            }`}
          >
            Instituto
          </span>
          <span
            className={`text-white font-bold tracking-[0.16em] sm:tracking-[0.28em] uppercase leading-tight transition-all duration-500 group-hover:opacity-90 ${
              isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
            }`}
          >
            DELPHOS
          </span>
        </Link>

        <div className="shrink-0 flex items-center gap-2 sm:gap-5 min-w-0">
          <nav
            aria-label="Institucional"
            className="flex items-center gap-2 sm:gap-4"
          >
            <Link
              to={ROUTES.PUBLIC.ABOUT}
              className="text-white/80 hover:text-white text-[10px] font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] transition-colors px-1.5 py-1"
            >
              Sobre
            </Link>
            <Link
              to={ROUTES.PUBLIC.DONATIONS}
              className="inline-flex items-center rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] px-2.5 sm:px-3 py-1.5 transition-colors"
            >
              Doações
            </Link>
          </nav>
          <Link
            to="/"
            className="flex items-center justify-end focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg shrink-0"
            aria-label={`${APP_CONFIG.name} — logotipo`}
          >
            <img
              src="/delphos-logo.png"
              alt=""
              className={`w-auto object-contain drop-shadow-md transition-all duration-500 ${
                isScrolled ? 'h-10 sm:h-14' : 'h-12 sm:h-[4.25rem]'
              }`}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
