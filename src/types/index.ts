/**
 * Tipos canônicos Firestore + modelos de UI (compatibilidade).
 * Preferir `./models/*` nas telas; `./evento`, `./pedido`, etc. nos services.
 */
export * from './base';
export * from './log';

export type {
  Evento,
  EventoStatus,
  EventoGaleriaItem,
  EventoVinculo,
  EventoCreate,
  EventoUpdate,
} from './evento';

export type {
  Banner as BannerDocument,
  BannerCreate,
  BannerUpdate,
} from './banner';

export type {
  Patrocinador as PatrocinadorDocument,
  PatrocinadorCreate,
  PatrocinadorUpdate,
} from './patrocinador';

export type {
  Instituicao as InstituicaoDocument,
  InstituicaoCreate,
  InstituicaoUpdate,
} from './instituicao';

export type {
  Ingresso as IngressoDocument,
  IngressoCreate,
  IngressoUpdate,
} from './ingresso';

export type {
  Pedido,
  PedidoItem,
  PedidoStatus,
  FormaPagamento,
  PedidoCreate,
  PedidoUpdate,
} from './pedido';

export type {
  Checkin as CheckinDocument,
  CheckinStatus,
  CheckinCreate,
  CheckinUpdate,
} from './checkin';

export type {
  Usuario as UsuarioDocument,
  UsuarioRole,
  UsuarioCreate,
  UsuarioUpdate,
} from './usuario';

export type {
  Configuracao as ConfiguracaoDocument,
  ConfiguracaoCreate,
  ConfiguracaoUpdate,
} from './configuracao';

export * from './models/event';
export * from './models/sponsor';
export * from './models/institution';
export * from './models/banner';
export * from './models/settings';
export * from './models/siteContent';
export * from './models/siteVideo';
export * from './models/user';
export * from './models/auth';
export * from './models/participant';
export * from './models/purchase';
export * from './models/ticket';
export * from './models/ticketHistory';
