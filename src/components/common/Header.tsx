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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'h-[85px] shadow-2xl shadow-black/40'
          : 'h-[115px]'
      } bg-gradient-to-r from-brand from-0% via-brand via-[28%] via-brand-dark via-[50%] via-brand-deeper via-[75%] to-[#050505]`}
    >
      <div className="page-container relative h-full flex items-center justify-between gap-4 sm:gap-6">
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
            className={`text-white font-bold tracking-[0.22em] sm:tracking-[0.28em] uppercase leading-tight transition-all duration-500 group-hover:opacity-90 ${
              isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
            }`}
          >
            DELPHOS
          </span>
        </Link>

        <div className="shrink-0 flex items-center gap-3 sm:gap-5">
          <Link
            to={ROUTES.PUBLIC.DONATIONS}
            className="sm:hidden inline-flex items-center rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-black uppercase tracking-[0.16em] px-3 py-1.5 transition-colors"
          >
            Doações
          </Link>
          <nav
            aria-label="Institucional"
            className="hidden sm:flex items-center gap-4"
          >
            <Link
              to={ROUTES.PUBLIC.ABOUT}
              className="text-white/80 hover:text-white text-[10px] font-black uppercase tracking-[0.18em] transition-colors"
            >
              Sobre
            </Link>
            <Link
              to={ROUTES.PUBLIC.DONATIONS}
              className="inline-flex items-center rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-black uppercase tracking-[0.18em] px-3 py-1.5 transition-colors"
            >
              Doações
            </Link>
          </nav>
          <Link
            to="/"
            className="flex items-center justify-end focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg"
            aria-label={`${APP_CONFIG.name} — logotipo`}
          >
            <img
              src="/delphos-logo.png"
              alt=""
              className={`w-auto object-contain drop-shadow-md transition-all duration-500 ${
                isScrolled ? 'h-12 sm:h-14' : 'h-14 sm:h-[4.25rem]'
              }`}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
