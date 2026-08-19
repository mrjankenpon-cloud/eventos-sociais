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
    data: Parameters<typeof pedidosService.create>[0] & {
      itens?: Array<{ ingressoId: string; quantidade: number }>;
      metodo?: 'pix' | 'checkout_pro';
    }
  ): Promise<{
    id: string;
    accessToken: string;
    initPoint?: string;
    pix?: boolean;
    gratuito: boolean;
    receiptUrl: string;
  }> => {
    const itens =
      data.itens && data.itens.length > 0
        ? data.itens.filter((i) => i.quantidade > 0)
        : data.ticketTypeId
          ? [
              {
                ingressoId: data.ticketTypeId,
                quantidade: data.quantidadeIngressos,
              },
            ]
          : [];
    const result = await checkoutApi.createSession({
      eventoId: data.eventId,
      itens,
      metodo: data.metodo,
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
      pix: result.pix,
      gratuito: result.gratuito,
      receiptUrl: result.receiptUrl,
    };
  },
  refund: (
    id: string,
    opts?: { ticketId?: string; amount?: number }
  ) => checkoutApi.refund(id, opts),
  createTicketUpgrade: (ticketId: string) =>
    checkoutApi.createTicketUpgrade(ticketId),
  confirmPayment: (id: string) => pedidosService.confirmPayment(id),
  update: (id: string, data: Parameters<typeof pedidosService.update>[1]) =>
    pedidosService.update(id, data),
  delete: (id: string) => pedidosService.delete(id),
};
