import type { FormaPagamento } from '../pedido';

export interface Purchase {
  id: string;
  eventId: string;
  tipo?: 'ingresso' | 'doacao' | 'upgrade';
  ticketTypeId?: string;
  ticketTypeNome?: string;
  compradorNome: string;
  compradorCPF: string;
  compradorTelefone: string;
  compradorEmail: string;
  documentoTipo?: 'cpf' | 'cnpj';
  certificadoNumero?: string;
  mensagemDoador?: string;
  dataCompra?: string;
  quantidadeIngressos: number;
  valorTotal: number;
  valorUnitario?: number;
  itens?: Array<{
    ingressoId: string;
    nome?: string;
    quantidade: number;
    valorUnitario?: number;
  }>;
  refundedAmount?: number;
  partialRefund?: boolean;
  statusPagamento:
    | 'pendente'
    | 'confirmado'
    | 'cancelado'
    | 'expirado'
    | 'reembolsado';
  /** PIX, cartão (mercadopago), gratuito, etc. */
  formaPagamento?: FormaPagamento;
  linkPagamento?: string;
  accessToken?: string;
  mpPreferenceId?: string;
  mpPaymentId?: string;
  mpStatus?: string;
  mpTransactionAmount?: number;
  mpFeeAmount?: number;
  mpNetReceivedAmount?: number;
  natureza?: string;
  /** Fim da reserva de estoque (PIX ingresso: até 10 dias). */
  reservaExpiraEm?: string;
  createdAt: string;
  updatedAt: string;
}
