import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FlashMessage } from '../../hooks/useFlashMessage';

interface ToastProps {
  message: FlashMessage | null;
  onClose?: () => void;
  className?: string;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-gray-900 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-brand text-white',
};

export function Toast({ message, onClose, className }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-[120]',
            'flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl',
            'max-w-[min(92vw,420px)] text-sm font-semibold',
            styles[message.type],
            className
          )}
        >
          {React.createElement(icons[message.type], {
            size: 18,
            className: 'shrink-0',
            'aria-hidden': true,
          })}
          <span className="min-w-0">{message.text}</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 p-1 rounded-full hover:bg-white/15"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
