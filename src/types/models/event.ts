import type { CheckinModo, IngressoNatureza } from '../ingressoNatureza';

export interface TicketType {
  id: string;
  /** Stable machine key — allows custom types later */
  key: string;
  nome: string;
  /** Optional public description — omit when empty */
  descricao: string;
  ativo: boolean;
  valor: number;
  /** Capacidade total */
  quantidade: number;
  /** Vendidos (Firestore) — inclui reservados + pagos */
  quantidadeVendida?: number;
  /** Disponíveis restantes (Firestore) */
  quantidadeDisponivel?: number;
  /** Limite por compra deste tipo (sobrescreve o do evento se definido) */
  limitePorCompra?: number;
  /** Natureza operacional (entrada, retirada, etc.) */
  natureza?: IngressoNatureza;
  /** Futuro: exige comprovação (meia na porta — não valida na compra) */
  exigeComprovacao?: boolean;
  checkinModo?: CheckinModo;
}

export interface GalleryImage {
  id: string;
  url: string;
  isCover: boolean;
  order: number;
  name?: string;
}

/** Ordered N:N link from an event to a catalog entity */
export interface EventEntityLink {
  id: string;
  ordem: number;
}

/**
 * @deprecated Embedded sponsor payload from older forms.
 * Migrated into the Sponsors catalog + patrocinadoresVinculados.
 */
export interface LegacyEmbeddedSponsor {
  id: string;
  nome: string;
  logo: string;
  site?: string;
  ordem: number;
  ativo: boolean;
}

export interface Event {
  id: string;
  titulo: string;
  subtitulo: string;
  categoria: string;
  descricaoCurta: string;
  descricaoCompleta: string;
  regulamento: string;
  banner: string;
  galeria: string[];
  imagens: GalleryImage[];
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  endereco: string;
  cidade: string;
  cep: string;
  googleMaps?: string;
  /** Legacy / derived from tiposIngresso for compatibility */
  gratuito: boolean;
  valor: number;
  vagas: number;
  mostrarVagas: boolean;
  mostrarValor: boolean;
  tiposIngresso: TicketType[];
  /** Ordered refs to catalog sponsors (N:N) */
  patrocinadoresVinculados: EventEntityLink[];
  /** Ordered refs to catalog institutions (N:N) */
  instituicoesVinculadas: EventEntityLink[];
  eventoDestaque: boolean;
  publicado: boolean;
  permitirInscricao: boolean;
  permitirCompraOnline: boolean;
  permitirRetiradaGratuita: boolean;
  exibirPatrocinadores: boolean;
  exibirInstituicoes: boolean;
  exibirMapa: boolean;
  exibirGaleria: boolean;
  textoBotao: string;
  /** @deprecated Prefer Checkout Pro; mantido para docs legados */
  linkPagamento: string;
  /** Limite padrão de itens por compra (sobrescrito por tipo se houver) */
  limitePorCompra?: number;
  /** Encerramento de vendas (ISO). Vendas param no primeiro entre isto e estoque zero. */
  vendasEncerramEm?: string;
  /** Soft-delete: arquivado não aparece no público nem aceita novas vendas */
  arquivado?: boolean;
  arquivadoEm?: string;
  /** Status Firestore canônico quando usado */
  status?: 'rascunho' | 'publicado' | 'oculto' | 'encerrado' | 'arquivado';
  createdAt: string;
  updatedAt: string;
}

export type EventFormData = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
