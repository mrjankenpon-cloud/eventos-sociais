export const APP_CONFIG = {
  name: 'DELPHOS',
  description: 'Gestão de eventos beneficentes e institucionais.',
  contact: {
    email: 'contato@ong.org.br',
    phone: '+55 (11) 99999-9999',
    address: 'Sede Social - São Paulo - SP'
  }
};

export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    EVENT_DETAILS: '/evento/:id',
    EVENT_REGISTRATION: '/evento/:id/inscricao',
    ORDER_SUCCESS: '/pedido/:id/sucesso',
    ORDER_LOOKUP: '/pedido/consultar',
    MY_TICKETS: '/meus-ingressos',
  },
  ADMIN: {
    LOGIN: '/controle/login',
    DASHBOARD: '/controle/dashboard',
    EVENTS: '/controle/eventos',
    EVENT_NEW: '/controle/eventos/novo',
    EVENT_EDIT: '/controle/eventos/editar/:id',
    EVENT_REPORTS: '/controle/eventos/relatorios/:id',
    EVENT_CHECKIN: '/controle/eventos/checkin/:id',
    PURCHASE_DETAILS: '/controle/compras/:id',
    SPONSORS: '/controle/patrocinadores',
    INSTITUTIONS: '/controle/instituicoes',
    PERMISSIONS: '/controle/permissoes',
    HEALTH: '/controle/health',
  }
};

export {
  MASTER_ADMIN_UID,
  isMasterAdminUid,
  isMasterAdminUser,
} from './masterAdmin';
