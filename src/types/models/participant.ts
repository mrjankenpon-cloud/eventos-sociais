export interface Participant {
  id: string;
  eventId: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  quantidadeIngressos: number;
  termosAceitos: boolean;
  statusPagamento: 'pendente' | 'confirmado';
  checkIn: string[]; // List of timestamps
  checkinRealizado: boolean;
  dataInscricao: string;
}
