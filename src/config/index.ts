export const APP_CONFIG = {
  name: 'DELPHOS',
  description: 'Gestão de eventos beneficentes e institucionais.',
  contact: {
    email: 'ingressos@institutodelphos.com.br',
    phone: '(11) 4193-5616',
    address: 'Rua Festival, 96 — Vila Barros, Barueri/SP — CEP 06410-280',
  },
};

export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    ABOUT: '/sobre',
    TERMS: '/termos',
    PRIVACY: '/privacidade',
    DONATIONS: '/doacoes',
    DONATION_SUCCESS: '/doacao/:id/sucesso',
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
    VIDEOS: '/controle/videos',
    PERMISSIONS: '/controle/permissoes',
    SITE_CONTENT: '/controle/conteudo',
    DOCUMENTATION: '/controle/documentacao',
    DONATIONS: '/controle/doacoes',
    HEALTH: '/controle/health',
  }
};

export {
  MASTER_ADMIN_UID,
  isMasterAdminUid,
  isMasterAdminUser,
} from './masterAdmin';
