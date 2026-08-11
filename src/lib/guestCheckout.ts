const GUEST_ORDER_KEY = 'delphos_guest_order';

/** Sessão guest no browser — não é Auth Firebase. */
export function persistGuestCheckoutSession(
  pedidoId: string,
  accessToken: string
) {
  try {
    sessionStorage.setItem(
      GUEST_ORDER_KEY,
      JSON.stringify({ pedidoId, accessToken })
    );
  } catch {
    /* ignore */
  }
}

export function readGuestCheckoutToken(pedidoId: string): string {
  try {
    const raw = sessionStorage.getItem(GUEST_ORDER_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as {
      pedidoId?: string;
      accessToken?: string;
    };
    if (parsed.pedidoId === pedidoId && parsed.accessToken) {
      return parsed.accessToken;
    }
  } catch {
    /* ignore */
  }
  return '';
}
