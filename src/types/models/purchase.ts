export interface Purchase {
  id: string;
  eventId: string;
  ticketTypeId?: string;
  ticketTypeNome?: string;
  compradorNome: string;
  compradorCPF: string;
  compradorTelefone: string;
  compradorEmail: string;
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
  linkPagamento?: string;
  accessToken?: string;
  mpPreferenceId?: string;
  mpPaymentId?: string;
  mpStatus?: string;
  mpTransactionAmount?: number;
  mpFeeAmount?: number;
  mpNetReceivedAmount?: number;
  natureza?: string;
  createdAt: string;
  updatedAt: string;
}
