import { checkinsService, checkinService } from './firebase/checkins';

/** Facade UI — histórico / check-ins */
export const ticketHistoryService = {
  create: (data: Parameters<typeof checkinService.logHistory>[0]) =>
    checkinService.logHistory(data),
  getById: (id: string) => checkinService.getById(id),
  getAll: () => checkinService.getAll(),
  update: (id: string, data: Parameters<typeof checkinService.update>[1]) =>
    checkinService.update(id, data),
  delete: (id: string) => checkinsService.delete(id),
  getByTicketId: (ticketId: string) => checkinsService.getByTicketId(ticketId),
};
