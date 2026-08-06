import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../../config';

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
      <div className="page-container relative h-full flex items-center justify-between gap-4">
        <Link
          to="/"
          className="group flex items-center shrink-0 focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg"
          aria-label={`${APP_CONFIG.name} — início`}
        >
          <span className="text-white font-bold tracking-[0.35em] sm:tracking-[0.4em] text-lg sm:text-xl uppercase transition-opacity group-hover:opacity-80">
            DELPHOS
          </span>
        </Link>

        <a
          href="#eventos"
          className="text-white/70 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors hidden sm:inline-flex"
        >
          Eventos
        </a>
      </div>
    </header>
  );
}
