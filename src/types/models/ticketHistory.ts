export type TicketHistoryType = 
  | 'Compra criada' 
  | 'Pagamento confirmado' 
  | 'Pagamento cancelado' 
  | 'Check-in realizado' 
  | 'Check-in cancelado' 
  | 'Ticket bloqueado' 
  | 'Ticket liberado';

export interface TicketHistory {
  id: string;
  ticketId: string;
  tipo: TicketHistoryType;
  data: string;
  usuario: string;
  observacao?: string;
}
