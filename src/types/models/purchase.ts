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
