import { pedidosService } from './firebase/pedidos';
import { checkinsService } from './firebase/checkins';

/** Facade UI — tickets emitidos + check-in */
export const ticketService = {
  getByPurchaseId: (purchaseId: string) =>
    pedidosService.getTicketsByPurchaseId(purchaseId),
  getByEventId: (eventId: string) => pedidosService.getTicketsByEventId(eventId),
  createTicketsForPurchase: (
    purchase: Parameters<typeof pedidosService.createTicketsForPurchase>[0]
  ) => pedidosService.createTicketsForPurchase(purchase),
  performCheckin: (
    ticketId: string,
    operator: string,
    expectedEventoId?: string
  ) => checkinsService.performCheckin(ticketId, operator, expectedEventoId),
  undoCheckin: (
    ticketId: string,
    operator: string,
    expectedEventoId?: string
  ) => checkinsService.undoCheckin(ticketId, operator, expectedEventoId),
  getByCode: (code: string) => pedidosService.getTicketByCode(code),
  getAll: () => pedidosService.getAllTickets(),
  getById: (id: string) => pedidosService.getTicketById(id),
  update: (id: string, data: Parameters<typeof pedidosService.updateTicket>[1]) =>
    pedidosService.updateTicket(id, data),
  delete: (id: string) => pedidosService.deleteTicket(id),
  create: async () => {
    throw new Error('Use createTicketsForPurchase para criar ingressos emitidos');
  },
};
