import { pedidosService } from './firebase/pedidos';

/** Facade UI — pedidos Firestore */
export const purchaseService = {
  getByEventId: (eventId: string) => pedidosService.getByEventId(eventId),
  getById: (id: string) => pedidosService.getById(id),
  create: (data: Parameters<typeof pedidosService.create>[0]) =>
    pedidosService.create(data),
  confirmPayment: (id: string) => pedidosService.confirmPayment(id),
  getAll: () => pedidosService.getAll(),
  update: (id: string, data: Parameters<typeof pedidosService.update>[1]) =>
    pedidosService.update(id, data),
  delete: (id: string) => pedidosService.delete(id),
};
