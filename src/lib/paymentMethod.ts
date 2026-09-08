import type { FormaPagamento } from '../types/pedido';

/** Rótulo operacional: PIX vs cartão (Checkout Pro grava `mercadopago`). */
export function paymentMethodLabel(
  forma?: FormaPagamento | string | null
): string {
  switch (forma) {
    case 'pix':
      return 'PIX';
    case 'cartao':
    case 'mercadopago':
      return 'Cartão';
    case 'boleto':
      return 'Boleto';
    case 'gratuito':
      return 'Gratuito';
    case 'externo':
      return 'Externo';
    case 'outro':
      return 'Outro';
    default:
      return '—';
  }
}

export function isCardPayment(forma?: FormaPagamento | string | null): boolean {
  return forma === 'cartao' || forma === 'mercadopago';
}
