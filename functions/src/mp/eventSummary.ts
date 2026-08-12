import { db } from './helpers';

export type EventTicketSummary = {
  titulo: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  endereco: string;
  cidade: string;
};

export async function loadEventTicketSummary(
  eventoId: unknown
): Promise<EventTicketSummary> {
  const id = String(eventoId || '').trim();
  if (!id) {
    return {
      titulo: '',
      data: '',
      horaInicio: '',
      horaFim: '',
      local: '',
      endereco: '',
      cidade: '',
    };
  }
  const ev = await db().collection('eventos').doc(id).get();
  if (!ev.exists) {
    return {
      titulo: '',
      data: '',
      horaInicio: '',
      horaFim: '',
      local: '',
      endereco: '',
      cidade: '',
    };
  }
  const d = ev.data() || {};
  return {
    titulo: String(d.titulo || ''),
    data: String(d.data || ''),
    horaInicio: String(d.horaInicio || ''),
    horaFim: String(d.horaFim || ''),
    local: String(d.local || ''),
    endereco: String(d.endereco || ''),
    cidade: String(d.cidade || ''),
  };
}
