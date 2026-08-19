/** Retorno do Checkout Pro (query string que o Mercado Pago acrescenta). */
export type MpReturnState = {
  fromMp: boolean;
  approved: boolean;
  pending: boolean;
  failed: boolean;
};

export function readMpReturn(searchParams: URLSearchParams): MpReturnState {
  const status = String(
    searchParams.get('collection_status') ||
      searchParams.get('status') ||
      ''
  )
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
  };
}
