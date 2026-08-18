import React, { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const INITIAL_FIELD =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  className,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  // Só na abertura do modal — não reexecutar quando onClose muda de identidade
  // (senão cada tecla no formulário rouba o foco de volta ao botão X).
  useEffect(() => {
    if (!isOpen) return;

    previousFocus.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const firstField = panel?.querySelector<HTMLElement>(INITIAL_FIELD);
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (firstField ?? focusables?.[0])?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 lg:p-10 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => onCloseRef.current()}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative w-full bg-white rounded-t-[1.75rem] md:rounded-[var(--radius-dialog)] shadow-2xl overflow-hidden flex flex-col max-h-[min(92dvh,800px)] my-auto',
              widths[maxWidth],
              className
            )}
          >
            <div className="px-4 sm:px-6 md:px-10 pt-6 sm:pt-8 md:pt-10 pb-4 flex items-start justify-between gap-4">
              {title ? (
                <h2 id={titleId} className="text-xl sm:text-2xl font-black text-gray-900">
                  {title}
                </h2>
              ) : (
                <span className="sr-only">Diálogo</span>
              )}
              <button
                type="button"
                onClick={() => onCloseRef.current()}
                aria-label="Fechar"
                className="shrink-0 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="px-4 sm:px-6 md:px-10 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-8 md:pb-10 overflow-y-auto min-w-0">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
