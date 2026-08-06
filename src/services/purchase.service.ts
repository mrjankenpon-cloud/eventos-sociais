import { Purchase } from '../types/models/purchase';
import { ticketService } from './ticket.service';
import { MOCK_PURCHASES } from '../mock';

class PurchaseService {
  private purchases: Purchase[] = [...MOCK_PURCHASES];

  async getByEventId(eventId: string): Promise<Purchase[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.purchases.filter(p => p.eventId === eventId);
  }

  async getById(id: string): Promise<Purchase | undefined> {
    return this.purchases.find(p => p.id === id);
  }

  async create(data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'statusPagamento'>): Promise<Purchase> {
    const newPurchase: Purchase = {
      ...data,
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      statusPagamento: 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.purchases.push(newPurchase);

    // Automatically create tickets
    await ticketService.createTicketsForPurchase(newPurchase);

    return newPurchase;
  }

  async confirmPayment(id: string): Promise<Purchase> {
    const index = this.purchases.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Compra não encontrada');

    this.purchases[index] = {
      ...this.purchases[index],
      statusPagamento: 'confirmado',
      updatedAt: new Date().toISOString()
    };

    // Confirm tickets associated with this purchase if necessary
    // In this flow, check-in is allowed regardless or after confirmation?
    // User says: "Tipos histórico: Compra criada, Pagamento confirmado..."
    
    return this.purchases[index];
  }

  async getAll(): Promise<Purchase[]> {
    return this.purchases;
  }
}

export const purchaseService = new PurchaseService();
