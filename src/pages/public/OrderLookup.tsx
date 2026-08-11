import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { checkoutApi } from '../../services/checkout.api';
import { Button, Alert, Input } from '../../components/ui';
import { ROUTES } from '../../config';
import { validateEmail } from '../../lib/validation';

/**
 * Recuperação guest exclusiva por e-mail → link seguro (Resend).
 * Não revela se o e-mail tem pedidos.
 */
export default function OrderLookup() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!validateEmail(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      const res = await checkoutApi.requestTicketsEmail(email.trim());
      setMessage(
        res.message ||
          'Se houver compras associadas a este e-mail, enviamos um link seguro.'
      );
    } catch (err) {
      // Mesmo em falha de rede, mensagem neutra quando possível
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível processar. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container py-16 max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-2xl bg-brand-muted text-brand">
          <Mail size={22} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight">
          Já comprou um ingresso?
        </h1>
      </div>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        Receba seus ingressos por e-mail. Informe o mesmo endereço usado na
        compra — sem login e sem criar conta.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {message ? <Alert variant="success">{message}</Alert> : null}

        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@email.com"
          required
          autoComplete="email"
        />

        <Button
          type="submit"
          className="w-full rounded-2xl"
          isLoading={loading}
          disabled={!validateEmail(email)}
        >
          Receber meus ingressos
        </Button>
      </form>

      <p className="mt-6 text-xs text-gray-400 leading-relaxed">
        Enviaremos um link seguro e temporário. Você poderá solicitar um novo
        link a qualquer momento. O envio depende da ativação do Resend (domínio
        oficial).
      </p>

      <p className="mt-8 text-center text-sm text-gray-400">
        <Link to={ROUTES.PUBLIC.HOME} className="hover:text-brand font-bold">
          Voltar à home
        </Link>
      </p>
    </div>
  );
}
