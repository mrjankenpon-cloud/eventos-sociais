import type { BaseDocument, CreateInput, UpdateInput } from './base';
import type { CheckinModo, IngressoNatureza } from './ingressoNatureza';

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
  ativo: boolean;
  natureza?: IngressoNatureza;
  exigeComprovacao?: boolean;
  checkinModo?: CheckinModo;
}

export type IngressoCreate = CreateInput<Ingresso>;
export type IngressoUpdate = UpdateInput<Ingresso>;
