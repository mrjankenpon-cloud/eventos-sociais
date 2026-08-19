export type TicketStatus = 'Disponível' | 'Utilizado' | 'Cancelado' | 'Reembolsado' | 'Bloqueado';

export interface Ticket {
  id: string;
  codigo: string;
  /** Hash criptográfico único — payload do QR */
  hash: string;
  /** Conteúdo serializado do QR */
  qrPayload: string;
  eventoId: string;
  compraId: string;
  pedidoId?: string;
  ingressoId?: string;
  ingressoKey?: string;
  ingressoNome?: string;
  natureza?: string;
  status: TicketStatus;
  ordem: number;
  checkinRealizado: boolean;
  checkinEm?: string;
  /** Controle operacional de retirada de produto (independente do financeiro) */
  retiradaRealizada?: boolean;
  retiradaEm?: string;
  operador?: string;
  ativo?: boolean;
  upgradedToInteira?: boolean;
  upgradeFromNome?: string;
  upgradePedidoId?: string;
  upgradeStatus?: string;
  createdAt: string;
  updatedAt: string;
}
