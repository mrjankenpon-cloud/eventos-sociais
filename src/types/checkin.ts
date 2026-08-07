import type { BaseDocument, CreateInput, UpdateInput } from './base';

export type CheckinStatus = 'realizado' | 'cancelado' | 'pendente';

export interface Checkin extends BaseDocument {
  pedidoId: string;
  ingressoId: string;
  ticketCodigo: string;
  ticketId: string;
  pessoaNome: string;
  pessoaDocumento?: string;
  horario: string;
  usuarioResponsavelId: string;
  usuarioResponsavelNome: string;
  eventoId: string;
  status: CheckinStatus;
  observacao?: string;
}

export type CheckinCreate = CreateInput<Checkin>;
export type CheckinUpdate = UpdateInput<Checkin>;
