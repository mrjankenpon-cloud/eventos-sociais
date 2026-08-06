import { Event } from '../types/models/event';
import { Participant } from '../types/models/participant';
import { User } from '../types/models/user';
import { Purchase } from '../types/models/purchase';
import { Ticket } from '../types/models/ticket';
import { TicketHistory } from '../types/models/ticketHistory';

export const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    titulo: 'Jantar Beneficente de Gala',
    descricaoCurta: 'Uma noite especial para apoiar crianças em tratamento oncológico.',
    descricaoCompleta: 'Participe do nosso tradicional jantar de gala. Todo o valor arrecadado será destinado à reforma da ala pediátrica do hospital regional. Teremos apresentações musicais ao vivo e leilão beneficente.',
    banner: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80',
    galeria: [
      'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80'
    ],
    data: '2026-08-23',
    horaInicio: '19:30',
    horaFim: '23:30',
    local: 'Clube dos Oficiais',
    endereco: 'Rua das Flores, 123, São Paulo - SP',
    googleMaps: 'https://maps.google.com',
    gratuito: false,
    valor: 180,
    vagas: 100,
    mostrarVagas: true,
    mostrarValor: true,
    eventoDestaque: true,
    publicado: true,
    permitirInscricao: true,
    textoBotao: 'Participar',
    linkPagamento: 'https://link-de-pagamento.com/jantar',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    titulo: 'Corrida Solidária 10k',
    descricaoCurta: 'Corra por uma causa. Transforme vidas com cada passo.',
    descricaoCompleta: 'A 5ª edição da nossa corrida solidária. Percursos de 5km e 10km. Kit completo incluso para todos os inscritos.',
    banner: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80',
    galeria: [],
    data: '2026-09-12',
    horaInicio: '08:00',
    horaFim: '12:00',
    local: 'Parque Ibirapuera',
    endereco: 'Av. Pedro Álvares Cabral, s/n, São Paulo - SP',
    gratuito: false,
    valor: 85,
    vagas: 500,
    mostrarVagas: true,
    mostrarValor: true,
    eventoDestaque: false,
    publicado: true,
    permitirInscricao: true,
    textoBotao: 'Inscrever-se',
    linkPagamento: 'https://link-de-pagamento.com/corrida',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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
    dataInscricao: new Date().toISOString()
  }
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
    updatedAt: new Date().toISOString()
  }
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
  }
];

export const MOCK_TICKET_HISTORY: TicketHistory[] = [
  {
    id: 'H1',
    ticketId: 'TKT-001',
    tipo: 'Compra criada',
    data: new Date().toISOString(),
    usuario: 'Sistema'
  },
  {
    id: 'H2',
    ticketId: 'TKT-002',
    tipo: 'Compra criada',
    data: new Date().toISOString(),
    usuario: 'Sistema'
  },
  {
    id: 'H3',
    ticketId: 'TKT-002',
    tipo: 'Check-in realizado',
    data: new Date().toISOString(),
    usuario: 'Sistema'
  }
];

export const MOCK_ADMIN_USER: User = {
  id: 'admin-1',
  name: 'Administrador DELPHOS',
  email: 'admin@vogel.com.br',
  role: 'admin',
};
