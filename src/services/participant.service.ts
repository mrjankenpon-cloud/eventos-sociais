import { pedidosService } from './firebase/pedidos';

/** Facade UI — participantes derivados de pedidos */
export const participantService = {
  getByEventId: (eventId: string) => pedidosService.getParticipantsByEventId(eventId),
  getAll: async () => {
    const purchases = await pedidosService.getAll();
    const byEvent = new Map<
      string,
      Awaited<ReturnType<typeof pedidosService.getParticipantsByEventId>>
    >();
    for (const p of purchases) {
      if (!byEvent.has(p.eventId)) {
        byEvent.set(p.eventId, await pedidosService.getParticipantsByEventId(p.eventId));
      }
    }
    return Array.from(byEvent.values()).flat();
  },
  create: async () => {
    throw new Error('Participantes são derivados das compras. Use purchaseService.create.');
  },
  update: async () => {
    throw new Error('Atualize o pedido correspondente via purchaseService.');
  },
  delete: async (eventId: string, participantId: string) => {
    const list = await pedidosService.getParticipantsByEventId(eventId);
    const found = list.find((p) => p.id === participantId);
    if (found) await pedidosService.delete(found.id);
  },
};
