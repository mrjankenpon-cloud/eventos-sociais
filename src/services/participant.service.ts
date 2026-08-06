import { Participant } from '../types/models/participant';
import { MOCK_PARTICIPANTS } from '../mock';

class ParticipantService {
  private participants: Participant[] = [...MOCK_PARTICIPANTS];

  async getByEventId(eventId: string): Promise<Participant[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.participants.filter(p => p.eventId === eventId);
  }

  async create(data: Omit<Participant, 'id' | 'dataInscricao' | 'checkIn' | 'statusPagamento' | 'checkinRealizado'>): Promise<Participant> {
    const newParticipant: Participant = {
      ...data,
      id: Math.random().toString(36).substring(2, 9),
      statusPagamento: 'pendente',
      checkIn: [],
      checkinRealizado: false,
      dataInscricao: new Date().toISOString(),
    };
    this.participants.push(newParticipant);
    return newParticipant;
  }

  async performCheckin(id: string): Promise<Participant> {
    const index = this.participants.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Participante não encontrado');

    this.participants[index] = {
      ...this.participants[index],
      checkinRealizado: true,
      checkIn: [...this.participants[index].checkIn, new Date().toISOString()]
    };
    return this.participants[index];
  }

  async updateCheckIn(id: string, count: number): Promise<Participant> {
    const index = this.participants.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Participante não encontrado');

    const newCheckIns = [...this.participants[index].checkIn];
    for (let i = 0; i < count; i++) {
      newCheckIns.push(new Date().toISOString());
    }

    this.participants[index] = {
      ...this.participants[index],
      checkIn: newCheckIns,
    };
    return this.participants[index];
  }

  async getAll(): Promise<Participant[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.participants;
  }

  async search(eventId: string, query: string): Promise<Participant[]> {
    const eventParticipants = await this.getByEventId(eventId);
    const q = query.toLowerCase();
    return eventParticipants.filter(p => 
      p.nome.toLowerCase().includes(q) || 
      p.cpf.includes(q) || 
      p.email.toLowerCase().includes(q)
    );
  }
}

export const participantService = new ParticipantService();
