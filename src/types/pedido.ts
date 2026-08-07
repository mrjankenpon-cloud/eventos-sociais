import type { BaseDocument, CreateInput, UpdateInput } from './base';

export type PedidoStatus =
  | 'pendente'
  | 'confirmado'
  | 'cancelado'
  | 'reembolsado';

export type FormaPagamento =
  | 'pix'
  | 'cartao'
  | 'boleto'
  | 'gratuito'
  | 'externo'
  | 'outro';

export interface PedidoItem {
  ingressoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
}

export interface Pedido extends BaseDocument {
  nomeComprador: string;
  cpf: string;
  telefone: string;
  email: string;
  eventoId: string;
  itens: PedidoItem[];
  quantidade: number;
  valorTotal: number;
  status: PedidoStatus;
  qrCode: string;
  dataCompra: string;
  formaPagamento: FormaPagamento;
  linkPagamento?: string;
  ingressoId?: string;
  ingressoNome?: string;
}

export type PedidoCreate = CreateInput<Pedido>;
export type PedidoUpdate = UpdateInput<Pedido>;
