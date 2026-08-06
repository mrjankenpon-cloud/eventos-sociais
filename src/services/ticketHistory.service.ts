import { TicketHistory, TicketHistoryType } from '../types/models/ticketHistory';
import { MOCK_TICKET_HISTORY } from '../mock';

class TicketHistoryService {
  private history: TicketHistory[] = [...MOCK_TICKET_HISTORY];

  async getByTicketId(ticketId: string): Promise<TicketHistory[]> {
    return this.history
      .filter(h => h.ticketId === ticketId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }

  async create(data: Omit<TicketHistory, 'id' | 'data'>): Promise<TicketHistory> {
    const newEntry: TicketHistory = {
      ...data,
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      data: new Date().toISOString(),
    };
    
    this.history.push(newEntry);
    return newEntry;
  }

  async getAll(): Promise<TicketHistory[]> {
    return this.history;
  }
}

export const ticketHistoryService = new TicketHistoryService();
