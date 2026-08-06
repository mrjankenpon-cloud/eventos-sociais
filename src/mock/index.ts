import { Participant } from '../types/models/participant';
import { User } from '../types/models/user';
import { Purchase } from '../types/models/purchase';
import { Ticket } from '../types/models/ticket';
import { TicketHistory } from '../types/models/ticketHistory';

export { MOCK_EVENTS } from './events';
export { MOCK_SPONSORS } from './sponsors';
export { MOCK_INSTITUTIONS } from './institutions';

export const MOCK_PARTICIPANTS: Participant[] = [
  {
    id: 'p1',
    eventId: '1',
    nome: 'João Silva',
    cpf: '123.456.789-00',
    telefone: '(11) 98888-7777',
    email: 'joao.silva@email.com',
    quantidadeIngressos: 2,
    termosAceitos: true,
    statusPagamento: 'confirmado',
    checkIn: [],
    checkinRealizado: false,
    dataInscricao: new Date().toISOString(),
  },
];

export const MOCK_PURCHASES: Purchase[] = [
  {
    id: 'COMPRA-001',
    eventId: '1',
    compradorNome: 'João Silva',
    compradorCPF: '123.456.789-00',
    compradorTelefone: '(11) 98888-7777',
    compradorEmail: 'joao.silva@email.com',
    quantidadeIngressos: 2,
    valorTotal: 360,
    statusPagamento: 'confirmado',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    codigo: 'DEL-2026-COMPRA-001-001',
    eventoId: '1',
    compraId: 'COMPRA-001',
    status: 'Disponível',
    ordem: 1,
    checkinRealizado: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'TKT-002',
    codigo: 'DEL-2026-COMPRA-001-002',
    eventoId: '1',
    compraId: 'COMPRA-001',
    status: 'Utilizado',
    ordem: 2,
    checkinRealizado: true,
    checkinEm: new Date().toISOString(),
    operador: 'Sistema',
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_TICKET_HISTORY: TicketHistory[] = [
  {
    id: 'H1',
    ticketId: 'TKT-001',
    tipo: 'Compra criada',
    data: new Date().toISOString(),
    usuario: 'Sistema',
  },
  {
    id: 'H2',
    ticketId: 'TKT-002',
    tipo: 'Compra criada',
    data: new Date().toISOString(),
    usuario: 'Sistema',
  },
  {
    id: 'H3',
    ticketId: 'TKT-002',
    tipo: 'Check-in realizado',
    data: new Date().toISOString(),
    usuario: 'Sistema',
  },
];

export const MOCK_ADMIN_USER: User = {
  id: 'admin-1',
  name: 'Administrador DELPHOS',
  email: 'admin@vogel.com.br',
  role: 'admin',
};
