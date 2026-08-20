import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG, ROUTES } from '../../config';
import { THEME } from '../../theme';
import { cn } from '../../lib/utils';
import { getScrollTop, onPageScroll } from '../../lib/pageScroll';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(getScrollTop() > 20);
    handleScroll();
    return onPageScroll(handleScroll, { passive: true });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('header-compact', isScrolled);
    return () => document.documentElement.classList.remove('header-compact');
  }, [isScrolled]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled ? 'shadow-2xl shadow-black/40' : '',
        THEME.gradient.header
      )}
      style={{
        height: 'calc(var(--header-height) + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="page-container relative h-full flex items-center justify-between gap-2 sm:gap-4 lg:gap-6 min-w-0">
        <Link
          to="/"
          className="group min-w-0 flex flex-col justify-center focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg py-1"
          aria-label="Instituto DELPHOS — início"
        >
          <span
            className={`text-white/90 font-medium tracking-[0.12em] uppercase transition-all duration-500 group-hover:text-white ${
              isScrolled
                ? 'text-[10px] sm:text-xs'
                : 'text-[11px] sm:text-xs md:text-sm'
            }`}
          >
            Instituto
          </span>
          <span
            className={`text-white font-bold tracking-[0.12em] sm:tracking-[0.2em] md:tracking-[0.28em] uppercase leading-tight transition-all duration-500 group-hover:opacity-90 ${
              isScrolled
                ? 'text-base sm:text-lg'
                : 'text-lg sm:text-xl md:text-[1.35rem]'
            }`}
          >
            DELPHOS
          </span>
        </Link>

        <div className="shrink-0 flex items-center gap-1.5 sm:gap-3 lg:gap-5 min-w-0">
          <nav aria-label="Institucional">
            <Link
              to={ROUTES.PUBLIC.DONATIONS}
              className="inline-flex items-center rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] px-2.5 sm:px-3 py-1.5 transition-colors"
            >
              Doações
            </Link>
          </nav>
          <Link
            to="/"
            className="flex items-center justify-end gap-1.5 sm:gap-2.5 lg:gap-3 focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg shrink-0"
            aria-label={`${APP_CONFIG.name} — logotipo`}
          >
            <img
              src="/delphos-logo.png"
              alt=""
              width={503}
              height={496}
              decoding="async"
              className={`w-auto object-contain drop-shadow-md transition-all duration-500 ${
                isScrolled
                  ? 'h-9 sm:h-12 md:h-14'
                  : 'h-10 sm:h-12 md:h-14 lg:h-[4.25rem]'
              }`}
            />
            <img
              src="/frafem-logo.png"
              alt="FRAFEM Delphos"
              width={1024}
              height={1024}
              decoding="async"
              className={`aspect-square w-auto rounded-full bg-white object-contain p-0.5 ring-1 ring-white/25 drop-shadow-md transition-all duration-500 ${
                isScrolled
                  ? 'h-8 sm:h-10 md:h-12'
                  : 'h-9 sm:h-10 md:h-12 lg:h-[3.75rem]'
              }`}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
