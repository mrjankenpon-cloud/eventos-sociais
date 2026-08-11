import type { BaseDocument, CreateInput, UpdateInput } from './base';

export type PedidoStatus =
  | 'pendente'
  | 'confirmado'
  | 'expirado'
  | 'cancelado'
  | 'reembolsado';

export type FormaPagamento =
  | 'pix'
  | 'cartao'
  | 'boleto'
  | 'gratuito'
  | 'mercadopago'
  | 'externo'
  | 'outro';

export interface PedidoItem {
  ingressoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  key?: string;
  natureza?: string;
}

export interface Pedido extends BaseDocument {
  nomeComprador: string;
  cpf: string;
  telefone: string;
  email: string;
  eventoId: string;
  itens: PedidoItem[];
  quantidade: number;
  /** Preço unitário oficial congelado na criação */
  valorUnitario: number;
  valorTotal: number;
  status: PedidoStatus;
  qrCode: string;
  dataCompra: string;
  formaPagamento: FormaPagamento;
  linkPagamento?: string;
  ingressoId?: string;
  ingressoKey?: string;
  ingressoNome?: string;
  natureza?: string;
  estoqueReservado?: boolean;
  reservaExpiraEm?: string;
  ticketsEmitidos?: boolean;
  /** Token opaco para página de sucesso / recibo */
  accessToken?: string;
  mpPreferenceId?: string;
  mpPaymentId?: string;
  mpStatus?: string;
  mpStatusDetail?: string;
  /** Valor bruto registrado pela API MP */
  mpTransactionAmount?: number;
  /** Taxas efetivas retornadas pela API MP (não estimadas) */
  mpFeeAmount?: number;
  /** Valor líquido retornado pela API MP */
  mpNetReceivedAmount?: number;
}

export type PedidoCreate = CreateInput<Pedido>;
export type PedidoUpdate = UpdateInput<Pedido>;
