/** Retorno do Checkout Pro (query string que o Mercado Pago acrescenta). */
export type MpReturnState = {
  fromMp: boolean;
  approved: boolean;
  pending: boolean;
  failed: boolean;
  statusDetail: string;
  paymentId: string;
};

export function readMpReturn(searchParams: URLSearchParams): MpReturnState {
  const status = String(
    searchParams.get('collection_status') ||
      searchParams.get('status') ||
      ''
  )
    .trim()
    .toLowerCase();
  const statusDetail = String(searchParams.get('status_detail') || '')
    .trim()
    .toLowerCase();
  const paymentId = String(
    searchParams.get('payment_id') || searchParams.get('collection_id') || ''
  ).replace(/\D/g, '');
  const fromMp = Boolean(
    paymentId ||
      searchParams.get('preference_id') ||
      searchParams.get('merchant_order_id')
  );
  return {
    fromMp,
    approved: status === 'approved',
    pending:
      status === 'pending' ||
      status === 'in_process' ||
      status === 'in_mediation',
    failed:
      status === 'rejected' ||
      status === 'cancelled' ||
      status === 'canceled' ||
      status === 'null',
    statusDetail,
    paymentId,
  };
}

/** Textos alinhados aos principais `status_detail` do Mercado Pago. Nunca exibe o código bruto. */
export function explainMpRejection(statusDetail?: string): string | null {
  const d = String(statusDetail || '').trim().toLowerCase();
  if (!d) return null;
  if (d.includes('insufficient') || d.includes('high_amount')) {
    return 'O cartão não tinha saldo ou limite suficiente. Tente outro cartão físico ou pague com PIX nesta página.';
  }
  if (d.includes('bad_filled_security')) {
    return 'O código de segurança (CVV) não conferiu. Confira e tente de novo, ou use PIX.';
  }
  if (d.includes('bad_filled_date')) {
    return 'A validade do cartão não conferiu. Confira mês e ano, ou use PIX.';
  }
  if (d.includes('bad_filled_card') || d.includes('bad_filled_other')) {
    return 'O número do cartão ou algum dado não conferiu. Confira e tente de novo, ou use PIX.';
  }
  if (d.includes('bad_filled') || d.includes('invalid')) {
    return 'Algum dado do cartão estava incorreto (número, validade, CVV ou nome). Confira e tente de novo, ou use PIX.';
  }
  if (d.includes('high_risk') || d.includes('blacklist') || d.includes('fraud')) {
    return (
      'O Mercado Pago bloqueou o cartão por antifraude (alto risco) na conta vendedora. ' +
      'Não é falha do site. Use PIX (já funciona neste evento) ou peça liberação de cartão no suporte do Mercado Pago.'
    );
  }
  if (d.includes('call_for_authorize') || d.includes('card_disabled')) {
    return 'O banco pediu autorização. Ligue para o banco no verso do cartão ou pague com PIX.';
  }
  if (d.includes('max_attempts') || d.includes('duplicated')) {
    return 'Houve muitas tentativas seguidas. Espere alguns minutos ou pague com PIX.';
  }
  if (d.includes('card_error') || d.includes('other_reason')) {
    return 'O banco recusou esta tentativa. Tente um cartão físico de crédito ou conclua com PIX.';
  }
  if (d === 'rejected' || d.startsWith('cc_rejected')) {
    return 'O cartão foi recusado. Tente um cartão físico de crédito ou conclua com PIX — é o caminho mais estável neste site.';
  }
  return null;
}
