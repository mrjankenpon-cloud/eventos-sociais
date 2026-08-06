export type TicketStatus = 'Disponível' | 'Utilizado' | 'Cancelado' | 'Reembolsado' | 'Bloqueado';

export interface Ticket {
  id: string;
  codigo: string;
  eventoId: string;
  compraId: string;
  status: TicketStatus;
  ordem: number;
  checkinRealizado: boolean;
  checkinEm?: string;
  operador?: string;
  createdAt: string;
}
