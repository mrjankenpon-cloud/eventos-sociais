import { Event } from '../types/models/event';
import { MOCK_EVENTS } from '../mock';
import { normalizeEvent, syncDerivedEventFields } from '../lib/eventForm';
import { DB_KEYS, loadCollection, saveCollection } from '../lib/persist';

function seedEvents(): Event[] {
  return MOCK_EVENTS.map((e) => normalizeEvent(e));
}

class EventService {
  /** Always read from persisted store — no in-memory cache. */
  private read(): Event[] {
    const stored = loadCollection(DB_KEYS.events, seedEvents);
    const normalized = stored.map((e) => normalizeEvent(e));
    const needsPersist = stored.some((e) => {
      const raw = e as Partial<Event>;
      return !Array.isArray(raw.tiposIngresso) || raw.tiposIngresso.length === 0;
    });
    if (needsPersist) {
      saveCollection(DB_KEYS.events, normalized);
    }
    return normalized;
  }

  private write(events: Event[]): void {
    saveCollection(
      DB_KEYS.events,
      events.map((e) => normalizeEvent(e))
    );
  }

  async getAll(): Promise<Event[]> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return this.read();
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
    const events = this.read();
    events.push(newEvent);
    this.write(events);
    return newEvent;
  }

  async update(id: string, data: Partial<Event>): Promise<Event> {
    const events = this.read();
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Evento não encontrado');

    events[index] = normalizeEvent({
      ...events[index],
      ...syncDerivedEventFields({ ...events[index], ...data }),
      id,
      updatedAt: new Date().toISOString(),
    });
    this.write(events);
    return events[index];
  }

  async delete(id: string): Promise<void> {
    this.write(this.read().filter((e) => e.id !== id));
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

  async unlinkSponsor(sponsorId: string): Promise<void> {
    this.write(
      this.read().map((e) =>
        normalizeEvent({
          ...e,
          patrocinadoresVinculados: e.patrocinadoresVinculados.filter(
            (l) => l.id !== sponsorId
          ),
        })
      )
    );
  }

  async unlinkInstitution(institutionId: string): Promise<void> {
    this.write(
      this.read().map((e) =>
        normalizeEvent({
          ...e,
          instituicoesVinculadas: e.instituicoesVinculadas.filter(
            (l) => l.id !== institutionId
          ),
        })
      )
    );
  }
}

export const eventService = new EventService();
