import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Alert } from '../../components/ui';
import { ROUTES, APP_CONFIG } from '../../config';
import { THEME } from '../../theme';
import { ACCESS_APPROVER_EMAIL } from '../../config/access';

export default function Login() {
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth();

  const from =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ||
    ROUTES.ADMIN.DASHBOARD;

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [authLoading, isAuthenticated, from, navigate]);

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
      }
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível entrar com Google.'
      );
      setIsGoogleLoading(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-dvh bg-surface-admin flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh overflow-y-auto bg-surface-admin flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
        className="w-full max-w-md"
      >
        <div className="card-surface p-6 sm:p-10">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-black text-brand tracking-widest mb-2">
              {APP_CONFIG.name}
            </h1>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Área Administrativa
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              Acesso exclusivo com Gmail autorizado
            </p>
          </div>

          <div className="space-y-4">
            <Button
              type="button"
              size="lg"
              variant="outline"
              isLoading={isGoogleLoading}
              onClick={() => void handleGoogle()}
              className="w-full rounded-2xl"
            >
              <GoogleIcon />
              {isGoogleLoading ? 'Conectando...' : 'Entrar com Gmail'}
            </Button>

            {error && <Alert variant="error">{error}</Alert>}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-gray-400 text-xs leading-relaxed">
              Sem permissão? Entre com seu Gmail: o pedido vai para{' '}
              {ACCESS_APPROVER_EMAIL} validar.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.3 44 32 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
