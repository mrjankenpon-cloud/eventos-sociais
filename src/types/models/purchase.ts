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
  statusPagamento: 'pendente' | 'confirmado' | 'cancelado';
  linkPagamento?: string;
  createdAt: string;
  updatedAt: string;
}
