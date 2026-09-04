import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartHandshake, Mail, Phone, User, Hash } from 'lucide-react';
import { LegalPage } from '../../components/public/LegalPage';
import { RichContent } from '../../components/public/RichContent';
import {
  PaymentMethodPicker,
  CARD_CHECKOUT_ENABLED,
  type CheckoutMetodo,
} from '../../components/public/PaymentMethodPicker';
import { Alert, Button, Input, PhoneInput, Textarea } from '../../components/ui';
import { checkoutApi } from '../../services/checkout.api';
import { persistGuestCheckoutSession } from '../../lib/guestCheckout';
import { formatCurrency } from '../../lib/utils';
import {
  maskCNPJ,
  maskCPF,
  validateCNPJ,
  validateCPF,
  validateEmail,
} from '../../lib/validation';
import { ROUTES } from '../../config';
import { cn } from '../../lib/utils';
import { useSiteContent } from '../../hooks/useSiteContent';
import { stripLeadingH1 } from '../../lib/siteContent';

const SUGGESTED = [30, 50, 100, 250, 500, 1000];
const MIN_DONATION = 10;

export default function Donations() {
  const navigate = useNavigate();
  const { content } = useSiteContent();
  const donations = content.donations;
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState('');
  const [docTipo, setDocTipo] = useState<'cpf' | 'cnpj'>('cpf');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [aceite, setAceite] = useState(false);
  const [phoneOk, setPhoneOk] = useState(false);
  const [metodo, setMetodo] = useState<CheckoutMetodo>('pix');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customNumber = Number(custom.replace(',', '.'));
  const effectiveAmount =
    custom.trim() && Number.isFinite(customNumber) && customNumber > 0
      ? Math.round(customNumber * 100) / 100
      : amount;

  const docDigits = documento.replace(/\D/g, '');
  const docOk =
    docTipo === 'cpf' ? validateCPF(docDigits) : validateCNPJ(docDigits);
  const nomeOk = nome.trim().length >= 4;
  const emailOk = validateEmail(email);
  const amountOk = effectiveAmount >= MIN_DONATION;
  const canSubmit =
    nomeOk && docOk && emailOk && phoneOk && amountOk && aceite && !submitting;

  const missing = useMemo(() => {
    const hints: string[] = [];
    if (!amountOk) hints.push(`valor mínimo de ${formatCurrency(MIN_DONATION)}`);
    if (!nomeOk) hints.push('nome completo');
    if (!docOk) hints.push(docTipo === 'cpf' ? 'CPF válido' : 'CNPJ válido');
    if (!phoneOk) hints.push('telefone');
    if (!emailOk) hints.push('e-mail');
    if (!aceite) hints.push('ciência das informações fiscais');
    return hints;
  }, [amountOk, nomeOk, docOk, docTipo, phoneOk, emailOk, aceite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await checkoutApi.createDonationSession({
        valor: effectiveAmount,
        metodo:
          CARD_CHECKOUT_ENABLED && metodo === 'checkout_pro'
            ? 'checkout_pro'
            : 'pix',
        doador: {
          nome: nome.trim(),
          documento: docDigits,
          documentoTipo: docTipo,
          email: email.trim(),
          telefone,
        },
        mensagem: mensagem.trim() || undefined,
      });
      persistGuestCheckoutSession(result.pedidoId, result.accessToken);
      if (result.pix || !result.initPoint) {
        navigate(
          `/doacao/${result.pedidoId}/sucesso?token=${encodeURIComponent(result.accessToken)}`
        );
        return;
      }
      window.location.href = result.initPoint;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível iniciar a doação. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LegalPage
      title="Doações para eventos beneficentes"
      subtitle="Apoie as ações solidárias do Instituto Delphos em Barueri e região."
    >
      <RichContent html={stripLeadingH1(donations.html)} />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
        {error ? (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <div className="space-y-3">
          <p className="label-micro">Escolha um valor</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {SUGGESTED.map((v) => {
              const selected = !custom.trim() && amount === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setAmount(v);
                    setCustom('');
                  }}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-sm font-black tabular-nums transition-all',
                    selected
                      ? 'border-brand bg-brand-muted/50 text-brand ring-2 ring-brand/20'
                      : 'border-gray-100 bg-white text-gray-800 hover:border-brand/40'
                  )}
                >
                  {formatCurrency(v, 0)}
                </button>
              );
            })}
          </div>
          <Input
            label="Outro valor (R$)"
            inputMode="decimal"
            placeholder="Ex.: 75"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            hint={`Mínimo ${formatCurrency(MIN_DONATION)}`}
          />
          <p className="text-sm font-black text-brand tabular-nums">
            Doação: {formatCurrency(effectiveAmount)}
          </p>
        </div>

        <div className="flex gap-2">
          {(['cpf', 'cnpj'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => {
                setDocTipo(tipo);
                setDocumento('');
              }}
              className={cn(
                'flex-1 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-wider',
                docTipo === tipo
                  ? 'border-brand bg-brand-muted/40 text-brand'
                  : 'border-gray-100 text-gray-500'
              )}
            >
              {tipo === 'cpf' ? 'Pessoa física' : 'Pessoa jurídica'}
            </button>
          ))}
        </div>

        <Input
          label={docTipo === 'cpf' ? 'Nome completo' : 'Razão social'}
          icon={<User size={18} />}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
        />

        <Input
          label={docTipo === 'cpf' ? 'CPF' : 'CNPJ'}
          icon={<Hash size={18} />}
          value={documento}
          onChange={(e) => {
            const raw = e.target.value;
            setDocumento(docTipo === 'cpf' ? maskCPF(raw) : maskCNPJ(raw));
          }}
          placeholder={docTipo === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
          inputMode="numeric"
          autoComplete="off"
        />

        <PhoneInput
          label="Telefone"
          icon={<Phone size={18} />}
          value={telefone}
          onChange={(val, ok) => {
            setTelefone(val);
            setPhoneOk(ok);
          }}
        />

        <Input
          label="E-mail"
          type="email"
          icon={<Mail size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          hint="Enviaremos o certificado neste endereço."
        />

        <Textarea
          label="Mensagem (opcional)"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value.slice(0, 280))}
          placeholder="Se quiser, deixe uma palavra de apoio."
        />

        <label className="flex items-start gap-3 text-sm text-gray-600">
          <input
            type="checkbox"
            className="mt-1 accent-brand"
            checked={aceite}
            onChange={(e) => setAceite(e.target.checked)}
          />
          <span>
            Declaro ciência das informações desta página e do{' '}
            <Link to={ROUTES.PUBLIC.TERMS} className="font-bold text-brand underline">
              Termo de Uso
            </Link>
            , entendendo que a doação é voluntária e que o certificado emitido
            não garante dedução fiscal.
          </span>
        </label>

        {!canSubmit && missing.length > 0 ? (
          <p className="text-xs text-gray-400">
            Falta: {missing.join(', ')}.
          </p>
        ) : null}

        <PaymentMethodPicker value={metodo} onChange={setMetodo} />

        <Button
          type="submit"
          className="w-full rounded-2xl"
          isLoading={submitting}
          disabled={!canSubmit}
        >
          <HeartHandshake className="w-4 h-4 mr-2" aria-hidden="true" />
          {!CARD_CHECKOUT_ENABLED || metodo === 'pix'
            ? `Doar ${formatCurrency(effectiveAmount)} via PIX`
            : `Doar ${formatCurrency(effectiveAmount)} com cartão`}
        </Button>
      </form>
    </LegalPage>
  );
}
