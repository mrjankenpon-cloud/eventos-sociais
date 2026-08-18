import type { Event, EventFormData, TicketType } from '../../types/models/event';
import type { Evento, EventoStatus } from '../../types/evento';
import type { Ingresso } from '../../types/ingresso';
import type { Pedido } from '../../types/pedido';
import type { Purchase } from '../../types/models/purchase';
import type { Banner as UiBanner } from '../../types/models/banner';
import type { Banner as FsBanner } from '../../types/banner';
import type { AppSettings } from '../../types/models/settings';
import type { Configuracao } from '../../types/configuracao';
import type { User } from '../../types/models/user';
import type { Usuario } from '../../types/usuario';
import type { Sponsor } from '../../types/models/sponsor';
import type { Patrocinador } from '../../types/patrocinador';
import type { Institution } from '../../types/models/institution';
import type { Instituicao } from '../../types/instituicao';
import { normalizeEvent, syncDerivedEventFields } from '../../lib/eventForm';
import { typeCompetesForEventSeats, defaultCompeteVagasEvento } from '../../types/ingressoNatureza';

function statusFromPublicado(
  publicado: boolean,
  oculto?: boolean,
  encerrado?: boolean,
  arquivado?: boolean
): EventoStatus {
  if (arquivado) return 'arquivado';
  if (encerrado) return 'encerrado';
  if (oculto) return 'oculto';
  return publicado ? 'publicado' : 'rascunho';
}

export function eventFormToEventoPayload(
  data: EventFormData | Partial<EventFormData>
): Record<string, unknown> {
  const synced = syncDerivedEventFields(data as EventFormData);
  const {
    tiposIngresso: _t,
    descricaoCurta,
    banner,
    imagens,
    galeria,
    googleMaps,
    vagas,
    patrocinadoresVinculados,
    instituicoesVinculadas,
    exibirPatrocinadores,
    exibirInstituicoes,
    publicado,
    ...rest
  } = synced as EventFormData & Record<string, unknown>;

  return {
    titulo: rest.titulo ?? '',
    subtitulo: rest.subtitulo ?? '',
    categoria: rest.categoria ?? '',
    resumo: descricaoCurta ?? '',
    descricaoCompleta: rest.descricaoCompleta ?? '',
    regulamento: rest.regulamento ?? '',
    imagemPrincipal: banner ?? '',
    galeria: imagens ?? [],
    galeriaUrls: galeria ?? [],
    data: rest.data ?? '',
    horaInicio: rest.horaInicio ?? '',
    horaFim: rest.horaFim ?? '',
    local: rest.local ?? '',
    endereco: rest.endereco ?? '',
    cidade: rest.cidade ?? '',
    cep: rest.cep ?? '',
    mapa: googleMaps ?? '',
    quantidadeMaxima: vagas ?? 0,
    quantidadeRestante: Math.max(
      0,
      (vagas ?? 0) - (Number(rest.vagasVendidasCompetindo) || 0)
    ),
    possuiPatrocinadores: Boolean(exibirPatrocinadores),
    possuiInstituicao: Boolean(exibirInstituicoes),
    patrocinadores: patrocinadoresVinculados ?? [],
    instituicoes: instituicoesVinculadas ?? [],
    status: statusFromPublicado(
      Boolean(publicado),
      false,
      false,
      Boolean(rest.arquivado)
    ),
    /** Espelha o status para queries/rules que usam o boolean */
    publicado: Boolean(publicado) && !Boolean(rest.arquivado),
    eventoDestaque: Boolean(rest.eventoDestaque),
    permitirInscricao: Boolean(rest.permitirInscricao),
    permitirCompraOnline: Boolean(rest.permitirCompraOnline),
    permitirRetiradaGratuita: Boolean(rest.permitirRetiradaGratuita),
    exibirMapa: Boolean(rest.exibirMapa),
    exibirGaleria: Boolean(rest.exibirGaleria),
    mostrarVagas: Boolean(rest.mostrarVagas),
    mostrarValor: Boolean(rest.mostrarValor),
    textoBotao: rest.textoBotao ?? '',
    linkPagamento: rest.linkPagamento ?? '',
    limitePorCompra: Number(rest.limitePorCompra) || 10,
    limitePorCpf: Math.max(0, Number(rest.limitePorCpf) || 0),
    vendasEncerramEm: rest.vendasEncerramEm || null,
    enviarNotificacao: Boolean(rest.enviarNotificacao),
    notificacaoEnviadaEm: rest.notificacaoEnviadaEm || null,
    arquivado: Boolean(rest.arquivado),
    arquivadoEm: rest.arquivadoEm || null,
    gratuito: Boolean(rest.gratuito),
    valor: Number(rest.valor) || 0,
    vagasVendidasCompetindo: Math.max(
      0,
      Number(rest.vagasVendidasCompetindo) || 0
    ),
    ativo: !Boolean(rest.arquivado),
  };
}

export function eventoToUiEvent(
  raw: Evento & Record<string, unknown>,
  tiposIngresso: TicketType[] = []
): Event {
  const status = (raw.status as EventoStatus) || 'rascunho';
  const tipos = tiposIngresso.map((t) => ({
    ...t,
    competeVagasEvento:
      typeof t.competeVagasEvento === 'boolean'
        ? t.competeVagasEvento
        : defaultCompeteVagasEvento(t.natureza, t.key),
  }));

  const storedVagas = Number(raw.quantidadeMaxima ?? raw.vagas) || 0;
  const allQty = tipos.reduce((s, t) => s + (Number(t.quantidade) || 0), 0);
  const competingQty = tipos
    .filter((t) => typeCompetesForEventSeats(t))
    .reduce((s, t) => s + (Number(t.quantidade) || 0), 0);
  const hasSoldField = typeof raw.vagasVendidasCompetindo === 'number';
  const vagas =
    !hasSoldField && allQty > 0 && storedVagas === allQty && competingQty !== allQty
      ? competingQty
      : storedVagas;

  const competingSold = tipos
    .filter((t) => typeCompetesForEventSeats(t))
    .reduce((s, t) => s + Math.max(0, t.quantidadeVendida || 0), 0);

  return normalizeEvent({
    id: raw.id,
    titulo: raw.titulo,
    subtitulo: raw.subtitulo,
    categoria: raw.categoria,
    descricaoCurta: raw.resumo ?? (raw.descricaoCurta as string) ?? '',
    descricaoCompleta: raw.descricaoCompleta ?? '',
    regulamento: raw.regulamento ?? '',
    banner: raw.imagemPrincipal ?? (raw.banner as string) ?? '',
    galeria: raw.galeriaUrls ?? (Array.isArray(raw.galeria) && typeof raw.galeria[0] === 'string'
      ? (raw.galeria as unknown as string[])
      : []),
    imagens: Array.isArray(raw.galeria) && raw.galeria[0] && typeof raw.galeria[0] === 'object'
      ? (raw.galeria as Event['imagens'])
      : (raw.imagens as Event['imagens']) ?? [],
    data: raw.data,
    horaInicio: raw.horaInicio ?? '',
    horaFim: raw.horaFim ?? '',
    local: raw.local ?? '',
    endereco: raw.endereco ?? '',
    cidade: raw.cidade ?? '',
    cep: raw.cep ?? '',
    googleMaps: raw.mapa ?? (raw.googleMaps as string),
    gratuito: raw.gratuito,
    valor: raw.valor,
    vagas,
    vagasVendidasCompetindo: hasSoldField
      ? Math.max(0, Number(raw.vagasVendidasCompetindo) || 0)
      : competingSold,
    mostrarVagas: raw.mostrarVagas !== false,
    mostrarValor: raw.mostrarValor !== false,
    tiposIngresso: tipos,
    patrocinadoresVinculados:
      raw.patrocinadores ??
      (raw.patrocinadoresVinculados as Event['patrocinadoresVinculados']) ??
      [],
    instituicoesVinculadas:
      raw.instituicoes ??
      (raw.instituicoesVinculadas as Event['instituicoesVinculadas']) ??
      [],
    eventoDestaque: raw.eventoDestaque,
    publicado: status === 'publicado',
    permitirInscricao: raw.permitirInscricao,
    permitirCompraOnline: raw.permitirCompraOnline,
    permitirRetiradaGratuita: raw.permitirRetiradaGratuita,
    exibirPatrocinadores: raw.possuiPatrocinadores ?? (raw.exibirPatrocinadores as boolean) ?? true,
    exibirInstituicoes: raw.possuiInstituicao ?? (raw.exibirInstituicoes as boolean) ?? true,
    exibirMapa: raw.exibirMapa,
    exibirGaleria: raw.exibirGaleria,
    textoBotao: raw.textoBotao,
    linkPagamento: raw.linkPagamento,
    limitePorCompra: (raw as { limitePorCompra?: number }).limitePorCompra ?? 10,
    limitePorCpf: Math.max(
      0,
      Number((raw as { limitePorCpf?: number }).limitePorCpf) || 0
    ),
    vendasEncerramEm: (raw as { vendasEncerramEm?: string }).vendasEncerramEm,
    enviarNotificacao: Boolean(
      (raw as { enviarNotificacao?: boolean }).enviarNotificacao
    ),
    notificacaoEnviadaEm: (raw as { notificacaoEnviadaEm?: string })
      .notificacaoEnviadaEm,
    arquivado:
      status === 'arquivado' ||
      Boolean((raw as { arquivado?: boolean }).arquivado),
    arquivadoEm: (raw as { arquivadoEm?: string }).arquivadoEm,
    status: status as Event['status'],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

export function ingressoToTicketType(ing: Ingresso): TicketType {
  const vendida = Math.max(0, ing.quantidadeVendida ?? 0);
  const total = Math.max(0, ing.quantidade ?? 0);
  const disponivel = Math.max(
    0,
    typeof ing.quantidadeDisponivel === 'number'
      ? ing.quantidadeDisponivel
      : total - vendida
  );
  return {
    id: ing.id,
    key: ing.key,
    nome: ing.nome,
    descricao: ing.descricao ?? '',
    ativo: ing.ativo,
    valor: ing.valor,
    quantidade: total,
    quantidadeVendida: vendida,
    quantidadeDisponivel: disponivel,
    limitePorCompra: ing.limitePorCompra,
    natureza: ing.natureza,
    competeVagasEvento:
      typeof ing.competeVagasEvento === 'boolean'
        ? ing.competeVagasEvento
        : defaultCompeteVagasEvento(ing.natureza, ing.key),
    exigeComprovacao: ing.exigeComprovacao,
    checkinModo: ing.checkinModo,
  };
}

export function ticketTypeToIngressoPayload(
  tipo: TicketType,
  eventoId: string
): Omit<Ingresso, 'id' | 'createdAt' | 'updatedAt'> {
  const vendida = 0;
  const natureza =
    tipo.natureza ??
    (tipo.key === 'retirada'
      ? 'retirada'
      : tipo.key === 'meia'
        ? 'entrada'
        : 'entrada');
  return {
    nome: tipo.nome,
    key: tipo.key,
    descricao: tipo.descricao ?? '',
    valor: tipo.valor,
    quantidade: tipo.quantidade,
    quantidadeVendida: vendida,
    quantidadeDisponivel: Math.max(0, tipo.quantidade - vendida),
    limitePorCompra: tipo.limitePorCompra ?? 10,
    eventoId,
    ativo: tipo.ativo,
    competeVagasEvento:
      typeof tipo.competeVagasEvento === 'boolean'
        ? tipo.competeVagasEvento
        : defaultCompeteVagasEvento(natureza, tipo.key),
    natureza,
    exigeComprovacao: tipo.exigeComprovacao ?? tipo.key === 'meia',
    checkinModo:
      tipo.checkinModo ?? (natureza === 'retirada' ? 'retirada' : 'entrada'),
  };
}

export function pedidoToPurchase(pedido: Pedido): Purchase {
  const first = pedido.itens?.[0];
  const statusPagamento =
    pedido.status === 'confirmado'
      ? 'confirmado'
      : pedido.status === 'cancelado'
        ? 'cancelado'
        : pedido.status === 'expirado'
          ? 'expirado'
          : pedido.status === 'reembolsado'
            ? 'reembolsado'
            : 'pendente';
  return {
    id: pedido.id,
    eventId: pedido.eventoId,
    tipo: pedido.tipo,
    ticketTypeId: pedido.ingressoId ?? first?.ingressoId,
    ticketTypeNome: pedido.ingressoNome ?? first?.nome,
    compradorNome: pedido.nomeComprador,
    compradorCPF: pedido.cpf,
    compradorTelefone: pedido.telefone,
    compradorEmail: pedido.email,
    documentoTipo: pedido.documentoTipo,
    certificadoNumero: pedido.certificadoNumero,
    mensagemDoador: pedido.mensagemDoador,
    dataCompra: pedido.dataCompra,
    quantidadeIngressos: pedido.quantidade,
    valorTotal: pedido.valorTotal,
    valorUnitario: pedido.valorUnitario ?? first?.valorUnitario,
    itens: pedido.itens?.map((i) => ({
      ingressoId: i.ingressoId,
      nome: i.nome,
      quantidade: i.quantidade,
      valorUnitario: i.valorUnitario,
    })),
    refundedAmount: (pedido as Pedido & { refundedAmount?: number }).refundedAmount,
    partialRefund: (pedido as Pedido & { partialRefund?: boolean }).partialRefund,
    statusPagamento,
    linkPagamento: pedido.linkPagamento,
    accessToken: pedido.accessToken,
    mpPreferenceId: pedido.mpPreferenceId,
    mpPaymentId: pedido.mpPaymentId,
    mpStatus: pedido.mpStatus,
    mpTransactionAmount: pedido.mpTransactionAmount,
    mpFeeAmount: pedido.mpFeeAmount,
    mpNetReceivedAmount: pedido.mpNetReceivedAmount,
    natureza: pedido.natureza,
    createdAt: pedido.createdAt,
    updatedAt: pedido.updatedAt,
  };
}

export function purchaseInputToPedidoPayload(
  data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'statusPagamento'>
): Omit<Pedido, 'id' | 'createdAt' | 'updatedAt'> {
  const qty = data.quantidadeIngressos;
  const unit =
    data.valorUnitario ?? (qty > 0 ? data.valorTotal / qty : data.valorTotal);
  return {
    nomeComprador: data.compradorNome,
    cpf: data.compradorCPF,
    telefone: data.compradorTelefone,
    email: data.compradorEmail,
    eventoId: data.eventId,
    itens: [
      {
        ingressoId: data.ticketTypeId ?? '',
        nome: data.ticketTypeNome ?? 'Ingresso',
        quantidade: qty,
        valorUnitario: unit,
      },
    ],
    quantidade: qty,
    valorUnitario: unit,
    valorTotal: data.valorTotal,
    status: 'pendente',
    qrCode: '',
    dataCompra: new Date().toISOString(),
    formaPagamento: data.valorTotal === 0 ? 'gratuito' : 'externo',
    linkPagamento: data.linkPagamento,
    ingressoId: data.ticketTypeId,
    ingressoNome: data.ticketTypeNome,
    natureza: data.natureza,
    ativo: true,
  };
}

export function fsBannerToUi(b: FsBanner & { eventId?: string; imagem?: string }): UiBanner {
  return {
    id: b.id,
    eventId: b.eventoId ?? b.eventId ?? '',
    titulo: b.titulo,
    subtitulo: b.subtitulo,
    imagem: b.imagemDesktop || b.imagemMobile || b.imagem || '',
    link: b.link,
    ordem: b.ordem,
    ativo: b.ativo,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export function uiBannerToFs(data: Partial<UiBanner>): Record<string, unknown> {
  const imagem = data.imagem ?? '';
  return {
    titulo: data.titulo ?? '',
    subtitulo: data.subtitulo ?? '',
    imagemDesktop: imagem,
    imagemMobile: imagem,
    eventoId: data.eventId || undefined,
    ordem: data.ordem ?? 0,
    ativo: data.ativo ?? true,
    link: data.link,
  };
}

export function configuracaoToSettings(c: Configuracao): AppSettings {
  return {
    id: c.id,
    nome: c.nomeSistema,
    descricao: c.descricao,
    email: c.email,
    telefone: c.telefone,
    endereco: c.endereco,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function settingsToConfiguracao(
  data: Partial<AppSettings>
): Record<string, unknown> {
  return {
    nomeSistema: data.nome ?? '',
    logotipo: '',
    descricao: data.descricao ?? '',
    email: data.email ?? '',
    telefone: data.telefone ?? '',
    endereco: data.endereco ?? '',
    rodape: '',
    redesSociais: {},
    tema: { modo: 'claro' },
    ativo: true,
  };
}

export function usuarioToUser(u: Usuario): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    ativo: u.ativo,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export function patrocinadorToSponsor(p: Patrocinador): Sponsor {
  return {
    id: p.id,
    nome: p.nome,
    logo: p.logo,
    site: p.site,
    instagram: p.instagram,
    facebook: p.facebook,
    email: p.email,
    telefone: p.telefone,
    descricao: p.descricao,
    ativo: p.ativo,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function instituicaoToInstitution(i: Instituicao): Institution {
  return {
    id: i.id,
    nome: i.nome,
    logo: i.logo,
    imagemDestaque: i.imagemDestaque,
    descricaoCurta: i.descricao,
    historia: i.historia ?? '',
    site: i.site,
    instagram: i.instagram,
    facebook: i.facebook,
    email: i.email,
    telefone: i.telefone,
    endereco: i.endereco,
    cidade: i.cidade,
    estado: i.estado,
    chavePix: i.pix,
    ativo: i.ativo,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export function institutionFormToFs(data: Partial<Institution>): Record<string, unknown> {
  return {
    nome: data.nome ?? '',
    logo: data.logo ?? '',
    imagemDestaque: data.imagemDestaque,
    descricao: data.descricaoCurta ?? '',
    historia: data.historia,
    site: data.site,
    instagram: data.instagram,
    facebook: data.facebook,
    email: data.email,
    telefone: data.telefone,
    endereco: data.endereco,
    cidade: data.cidade,
    estado: data.estado,
    pix: data.chavePix,
    ativo: data.ativo ?? true,
  };
}
