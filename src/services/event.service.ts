import { Event } from '../types/models/event';
import { MOCK_EVENTS } from '../mock';

class EventService {
  private events: Event[] = [...MOCK_EVENTS];

  async getAll(): Promise<Event[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.events;
  }

  async getPublished(): Promise<Event[]> {
    const events = await this.getAll();
    return events.filter(e => e.publicado);
  }

  async getById(id: string): Promise<Event | undefined> {
    const events = await this.getAll();
    return events.find(e => e.id === id);
  }

  async create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const newEvent: Event = {
      ...data,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.events.push(newEvent);
    return newEvent;
  }

  async update(id: string, data: Partial<Event>): Promise<Event> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Evento não encontrado');
    
    this.events[index] = {
      ...this.events[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.events[index];
  }

  async delete(id: string): Promise<void> {
    this.events = this.events.filter(e => e.id !== id);
  }
}

export const eventService = new EventService();
