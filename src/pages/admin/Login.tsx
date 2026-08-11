import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input, Button, Alert } from '../../components/ui';
import { ROUTES, APP_CONFIG } from '../../config';
import { THEME } from '../../theme';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, isLoading: authLoading } =
    useAuth();
  const userRef = useRef<HTMLInputElement>(null);

  const from =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ||
    ROUTES.ADMIN.DASHBOARD;

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [authLoading, isAuthenticated, from, navigate]);

  useEffect(() => {
    if (showPasswordForm) userRef.current?.focus();
  }, [showPasswordForm]);

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao realizar login.';
      setError(
        message.toLowerCase().includes('credencial') ||
          message.toLowerCase().includes('senha') ||
          message.toLowerCase().includes('usuário') ||
          message.toLowerCase().includes('invalid')
          ? 'Credenciais inválidas. Verifique seu usuário e senha.'
          : message
      );
      setIsLoading(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-admin flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-admin flex items-center justify-center p-4 sm:p-6 overflow-x-hidden">
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
              Entre com a conta Google autorizada em Permissões
            </p>
          </div>

          <div className="space-y-4">
            <Button
              type="button"
              size="lg"
              variant="outline"
              isLoading={isGoogleLoading}
              disabled={isLoading}
              onClick={() => void handleGoogle()}
              className="w-full rounded-2xl"
            >
              <GoogleIcon />
              {isGoogleLoading ? 'Conectando...' : 'Entrar com Google'}
            </Button>

            <button
              type="button"
              onClick={() => setShowPasswordForm((v) => !v)}
              className="w-full text-center text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-brand transition-colors py-2"
            >
              {showPasswordForm ? 'Ocultar acesso por senha' : 'Acesso por senha'}
            </button>

            {showPasswordForm && (
              <form onSubmit={handleLogin} className="space-y-5 pt-2">
                <Input
                  ref={userRef}
                  label="E-mail ou usuário"
                  icon={<User size={18} />}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="controleadmin"
                  autoComplete="username"
                  required
                />

                <div className="relative">
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    icon={<Lock size={18} />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 bottom-[14px] p-1.5 text-gray-400 hover:text-brand transition-colors rounded-lg"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full rounded-2xl"
                >
                  {isLoading ? 'Entrando...' : 'Entrar com senha'}
                </Button>
              </form>
            )}

            {error && <Alert variant="error">{error}</Alert>}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-gray-400 text-xs">
              Sem acesso? Peça a um administrador para cadastrar seu e-mail Google
              em Permissões.
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
