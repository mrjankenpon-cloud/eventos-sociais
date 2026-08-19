/** Retorno do Checkout Pro (query string que o Mercado Pago acrescenta). */
export type MpReturnState = {
  fromMp: boolean;
  approved: boolean;
  pending: boolean;
  failed: boolean;
  statusDetail: string;
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
  const fromMp = Boolean(
    searchParams.get('payment_id') ||
      searchParams.get('collection_id') ||
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
  };
}

/** Textos alinhados aos principais `status_detail` do Mercado Pago. */
export function explainMpRejection(statusDetail?: string): string | null {
  const d = String(statusDetail || '').trim().toLowerCase();
  if (!d) return null;
  if (d.includes('insufficient') || d.includes('high_amount')) {
    return 'O cartão não tinha saldo ou limite suficiente. Tente outro cartão ou pague com PIX nesta página.';
  }
  if (d.includes('bad_filled') || d.includes('invalid')) {
    return 'Algum dado do cartão estava incorreto (número, validade, CVV ou nome). Confira e tente de novo, ou use PIX.';
  }
  if (d.includes('high_risk') || d.includes('blacklist') || d.includes('fraud')) {
    return 'O Mercado Pago recusou por segurança. Isso é comum em cartão novo ou conta recente. PIX costuma passar na hora.';
  }
  if (d.includes('call_for_authorize') || d.includes('card_disabled')) {
    return 'O banco pediu autorização. Ligue para o banco no verso do cartão ou pague com PIX.';
  }
  if (d.includes('max_attempts') || d.includes('duplicated')) {
    return 'Houve muitas tentativas seguidas. Espere alguns minutos ou pague com PIX.';
  }
  if (d === 'rejected' || d.startsWith('cc_rejected')) {
    return 'O cartão foi recusado. Tente outro cartão ou conclua com PIX — é o caminho mais estável neste site.';
  }
  return null;
}
