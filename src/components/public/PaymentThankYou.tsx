type PaymentThankYouProps = {
  kind: 'ingresso' | 'doacao';
  nome?: string;
  confirmed: boolean;
  fromMp: boolean;
  mpApproved: boolean;
};

export function PaymentThankYou({
  kind,
  nome,
  confirmed,
  fromMp,
  mpApproved,
}: PaymentThankYouProps) {
  if (!fromMp && !confirmed) return null;

  const firstName = String(nome || '')
    .trim()
    .split(/\s+/)[0];
  const hello = firstName ? `Obrigado, ${firstName}!` : 'Obrigado!';
  const waitingForWebhook = fromMp && mpApproved && !confirmed;

  if (kind === 'doacao') {
    if (waitingForWebhook) {
      return (
        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          {hello} Recebemos o retorno do Mercado Pago. Em alguns segundos a
          doação é confirmada nesta página e o certificado aparece aqui.
        </p>
      );
    }
    if (confirmed) {
      return (
        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          {hello} Sua doação foi confirmada. Boas ações são sempre bem-vindas —
          o certificado está abaixo e também no e-mail cadastrado.
        </p>
      );
    }
    return null;
  }

  if (waitingForWebhook) {
    return (
      <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
        {hello} Seu pagamento foi aprovado no Mercado Pago. Estamos confirmando
        no site — em alguns segundos os ingressos aparecem nesta página.
      </p>
    );
  }

  if (confirmed) {
    return (
      <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
        {hello} Seu pagamento foi confirmado. Abaixo estão seus ingressos, com
        texto e código. Também enviamos o acesso para o e-mail da inscrição.
      </p>
    );
  }

  return null;
}
