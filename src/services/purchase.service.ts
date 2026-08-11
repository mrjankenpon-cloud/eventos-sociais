import { pedidosService } from './firebase/pedidos';
import { checkoutApi } from './checkout.api';

/** Facade UI — leitura Firestore; criação via Cloud Functions (MP). */
export const purchaseService = {
  getByEventId: (eventId: string) => pedidosService.getByEventId(eventId),
  getById: (id: string) => pedidosService.getById(id),
  getAll: () => pedidosService.getAll(),
  /**
   * @deprecated Use checkoutApi.createSession — preço/estoque só no backend.
   */
  create: async (
    data: Parameters<typeof pedidosService.create>[0]
  ): Promise<{
    id: string;
    accessToken: string;
    initPoint?: string;
    gratuito: boolean;
    receiptUrl: string;
  }> => {
    const result = await checkoutApi.createSession({
      eventoId: data.eventId,
      ingressoId: data.ticketTypeId || '',
      quantidade: data.quantidadeIngressos,
      comprador: {
        nome: data.compradorNome,
        cpf: data.compradorCPF,
        telefone: data.compradorTelefone,
        email: data.compradorEmail,
      },
    });
    return {
      id: result.pedidoId,
      accessToken: result.accessToken,
      initPoint: result.initPoint,
      gratuito: result.gratuito,
      receiptUrl: result.receiptUrl,
    };
  },
  refund: (id: string) => checkoutApi.refund(id),
  confirmPayment: (id: string) => pedidosService.confirmPayment(id),
  update: (id: string, data: Parameters<typeof pedidosService.update>[1]) =>
    pedidosService.update(id, data),
  delete: (id: string) => pedidosService.delete(id),
};
