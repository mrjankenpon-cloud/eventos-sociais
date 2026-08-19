/** Observação operacional no check-in após PIX da diferença. */
export const MEIA_CONVERTIDA_OBS = 'Meia convertida em inteira';

export function wasMeiaConvertedToInteira(ticket: {
  upgradedToInteira?: boolean;
}): boolean {
  return ticket.upgradedToInteira === true;
}
