import type { BaseDocument, CreateInput, UpdateInput } from './base';

export type EventoStatus = 'rascunho' | 'publicado' | 'oculto' | 'encerrado';

export interface EventoGaleriaItem {
  id: string;
  url: string;
  isCover: boolean;
  order: number;
  name?: string;
}

export interface EventoVinculo {
  id: string;
  ordem: number;
}

export interface Evento extends BaseDocument {
  titulo: string;
  subtitulo: string;
  categoria: string;
  resumo: string;
  descricaoCompleta: string;
  regulamento: string;
  imagemPrincipal: string;
  galeria: EventoGaleriaItem[];
  /** URLs legado (derivado da galeria) */
  galeriaUrls: string[];
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  endereco: string;
  cidade: string;
  cep: string;
  mapa: string;
  quantidadeMaxima: number;
  quantidadeRestante: number;
  possuiPatrocinadores: boolean;
  possuiInstituicao: boolean;
  patrocinadores: EventoVinculo[];
  instituicoes: EventoVinculo[];
  status: EventoStatus;
  eventoDestaque: boolean;
  permitirInscricao: boolean;
  permitirCompraOnline: boolean;
  permitirRetiradaGratuita: boolean;
  exibirMapa: boolean;
  exibirGaleria: boolean;
  mostrarVagas: boolean;
  mostrarValor: boolean;
  textoBotao: string;
  linkPagamento: string;
  /** Campos derivados para compatibilidade de preço */
  gratuito: boolean;
  valor: number;
}

export type EventoCreate = CreateInput<Evento>;
export type EventoUpdate = UpdateInput<Evento>;
