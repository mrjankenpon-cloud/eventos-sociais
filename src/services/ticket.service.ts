import { Ticket, TicketStatus } from '../types/models/ticket';
import { Purchase } from '../types/models/purchase';
import { ticketHistoryService } from './ticketHistory.service';
import { MOCK_TICKETS } from '../mock';

class TicketService {
  private tickets: Ticket[] = [...MOCK_TICKETS];

  async getByPurchaseId(purchaseId: string): Promise<Ticket[]> {
    return this.tickets.filter(t => t.compraId === purchaseId);
  }

  async getByEventId(eventId: string): Promise<Ticket[]> {
    return this.tickets.filter(t => t.eventoId === eventId);
  }

  async createTicketsForPurchase(purchase: Purchase): Promise<Ticket[]> {
    const newTickets: Ticket[] = [];
    const year = new Date().getFullYear();
    
    for (let i = 1; i <= purchase.quantidadeIngressos; i++) {
      // Format: DEL-2026-COMPRAID-001
      const codigo = `DEL-${year}-${purchase.id}-${i.toString().padStart(3, '0')}`;
      
      const ticket: Ticket = {
        id: Math.random().toString(36).substring(2, 9).toUpperCase(),
        codigo,
        eventoId: purchase.eventId,
        compraId: purchase.id,
        status: 'Disponível',
        ordem: i,
        checkinRealizado: false,
        createdAt: new Date().toISOString(),
      };
      
      this.tickets.push(ticket);
      newTickets.push(ticket);

      // Create history
      await ticketHistoryService.create({
        ticketId: ticket.id,
        tipo: 'Compra criada',
        usuario: 'Sistema',
        observacao: `Ticket gerado para a compra ${purchase.id}`
      });
    }
    
    return newTickets;
  }

  async performCheckin(ticketId: string, operator: string): Promise<Ticket> {
    const index = this.tickets.findIndex(t => t.id === ticketId);
    if (index === -1) throw new Error('Ticket não encontrado');
    
    if (this.tickets[index].status === 'Utilizado') {
      throw new Error('Este ticket já foi utilizado');
    }

    if (this.tickets[index].status !== 'Disponível') {
      throw new Error(`Este ticket não está disponível (Status: ${this.tickets[index].status})`);
    }

    this.tickets[index] = {
      ...this.tickets[index],
      status: 'Utilizado',
      checkinRealizado: true,
      checkinEm: new Date().toISOString(),
      operador: operator
    };

    await ticketHistoryService.create({
      ticketId: this.tickets[index].id,
      tipo: 'Check-in realizado',
      usuario: operator,
      observacao: 'Check-in via painel administrativo'
    });

    return this.tickets[index];
  }

  async search(query: string): Promise<{ tickets: Ticket[], purchase?: Purchase }[]> {
    const q = query.toLowerCase();
    
    // This is a simplified search for mock. In real DB would be more complex.
    // We need to return tickets grouped by purchase or at least the tickets found.
    
    // Find tickets by code
    const ticketsByCode = this.tickets.filter(t => t.codigo.toLowerCase().includes(q));
    
    // If no tickets found, maybe it's a purchase code, or user info?
    // This logic will be more complete in the UI/Service integration
    return []; 
  }

  async getByCode(code: string): Promise<Ticket | undefined> {
    return this.tickets.find(t => t.codigo === code);
  }

  async getAll(): Promise<Ticket[]> {
    return this.tickets;
  }
}

export const ticketService = new TicketService();
