import { Event } from '../types/models/event';
import { MOCK_EVENTS } from '../mock';
import { normalizeEvent, syncDerivedEventFields } from '../lib/eventForm';

class EventService {
  private events: Event[] = MOCK_EVENTS.map((e) => normalizeEvent(e));

  async getAll(): Promise<Event[]> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return this.events.map((e) => normalizeEvent(e));
  }

  async getPublished(): Promise<Event[]> {
    const events = await this.getAll();
    return events.filter((e) => e.publicado);
  }

  async getById(id: string): Promise<Event | undefined> {
    const events = await this.getAll();
    return events.find((e) => e.id === id);
  }

  async create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const synced = syncDerivedEventFields(data);
    const newEvent = normalizeEvent({
      ...synced,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    this.events.push(newEvent);
    return newEvent;
  }

  async update(id: string, data: Partial<Event>): Promise<Event> {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Evento não encontrado');

    this.events[index] = normalizeEvent({
      ...this.events[index],
      ...syncDerivedEventFields({ ...this.events[index], ...data }),
      updatedAt: new Date().toISOString(),
    });
    return this.events[index];
  }

  async delete(id: string): Promise<void> {
    this.events = this.events.filter((e) => e.id !== id);
  }

  async countBySponsor(sponsorId: string): Promise<number> {
    const events = await this.getAll();
    return events.filter((e) =>
      e.patrocinadoresVinculados.some((l) => l.id === sponsorId)
    ).length;
  }

  async countByInstitution(institutionId: string): Promise<number> {
    const events = await this.getAll();
    return events.filter((e) =>
      e.instituicoesVinculadas.some((l) => l.id === institutionId)
    ).length;
  }

  /** Removes broken links when a catalog entity is deleted */
  async unlinkSponsor(sponsorId: string): Promise<void> {
    this.events = this.events.map((e) =>
      normalizeEvent({
        ...e,
        patrocinadoresVinculados: e.patrocinadoresVinculados.filter(
          (l) => l.id !== sponsorId
        ),
      })
    );
  }

  async unlinkInstitution(institutionId: string): Promise<void> {
    this.events = this.events.map((e) =>
      normalizeEvent({
        ...e,
        instituicoesVinculadas: e.instituicoesVinculadas.filter(
          (l) => l.id !== institutionId
        ),
      })
    );
  }
}

export const eventService = new EventService();
