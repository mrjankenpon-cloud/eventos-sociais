import type { BaseDocument, CreateInput, UpdateInput } from './base';

export interface Ingresso extends BaseDocument {
  nome: string;
  key: string;
  descricao: string;
  valor: number;
  quantidade: number;
  quantidadeVendida: number;
  quantidadeDisponivel: number;
  limitePorCompra: number;
  eventoId: string;
}

export type IngressoCreate = CreateInput<Ingresso>;
export type IngressoUpdate = UpdateInput<Ingresso>;
