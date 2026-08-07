import type { BaseDocument, CreateInput } from './base';

export interface LogChange {
  campo: string;
  de: string | number | boolean | null;
  para: string | number | boolean | null;
}

export interface LogEntry extends BaseDocument {
  usuarioId: string;
  usuarioNome: string;
  acao: string;
  colecao: string;
  documentoId: string;
  descricao: string;
  dataHora: string;
  alteracoes?: LogChange[];
  metadata?: Record<string, string | number | boolean | null>;
}

export type LogCreate = Omit<CreateInput<LogEntry>, 'ativo'> & { ativo?: boolean };
