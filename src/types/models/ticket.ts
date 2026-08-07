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
  ingressoId?: string;
  status: TicketStatus;
  ordem: number;
  checkinRealizado: boolean;
  checkinEm?: string;
  operador?: string;
  ativo?: boolean;
  createdAt: string;
  updatedAt: string;
}
