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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const userRef = useRef<HTMLInputElement>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || ROUTES.ADMIN.DASHBOARD;

  useEffect(() => {
    userRef.current?.focus();
  }, []);

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
          : 'Não foi possível entrar. Verifique suas credenciais ou tente mais tarde.'
      );
      setIsLoading(false);
    }
  };

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
              Acesse o painel para gerenciar seus eventos
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              ref={userRef}
              label="E-mail ou usuário"
              icon={<User size={18} />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@seudominio.com"
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

            {error && <Alert variant="error">{error}</Alert>}

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full rounded-2xl"
            >
              {isLoading ? 'Entrando...' : 'Entrar no Painel'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-gray-400 text-xs">
              Esqueceu sua senha? Entre em contato com o suporte.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
