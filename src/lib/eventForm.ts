import type {
  Event,
  EventEntityLink,
  EventFormData,
  GalleryImage,
  LegacyEmbeddedSponsor,
  TicketType,
} from '../types/models/event';
import { createId } from './utils';

export { createId };

export function defaultTicketTypes(): TicketType[] {
  return [
    {
      id: createId('tt'),
      key: 'inteira',
      nome: 'Inteira',
      descricao: '',
      ativo: true,
      valor: 0,
      quantidade: 100,
    },
    {
      id: createId('tt'),
      key: 'meia',
      nome: 'Meia-Entrada',
      descricao: '',
      ativo: false,
      valor: 0,
      quantidade: 0,
    },
    {
      id: createId('tt'),
      key: 'retirada',
      nome: 'Retirada',
      descricao: '',
      ativo: false,
      valor: 0,
      quantidade: 0,
    },
  ];
}

export function createEmptyEventForm(): EventFormData {
  return {
    titulo: '',
    subtitulo: '',
    categoria: '',
    descricaoCurta: '',
    descricaoCompleta: '',
    regulamento: '',
    banner: '',
    galeria: [],
    imagens: [],
    data: '',
    horaInicio: '',
    horaFim: '',
    local: '',
    endereco: '',
    cidade: '',
    cep: '',
    googleMaps: '',
    gratuito: false,
    valor: 0,
    vagas: 0,
    mostrarVagas: true,
    mostrarValor: true,
    tiposIngresso: defaultTicketTypes(),
    patrocinadoresVinculados: [],
    instituicoesVinculadas: [],
    eventoDestaque: false,
    publicado: false,
    permitirInscricao: true,
    permitirCompraOnline: true,
    permitirRetiradaGratuita: false,
    exibirPatrocinadores: true,
    exibirInstituicoes: true,
    exibirMapa: true,
    exibirGaleria: true,
    textoBotao: 'Garantir minha vaga',
    linkPagamento: '',
  };
}

/** Keep legacy fields in sync so the rest of the app keeps working. */
export function syncDerivedEventFields<T extends Partial<EventFormData>>(data: T): T {
  const tipos = data.tiposIngresso ?? [];
  const ativos = tipos.filter((t) => t.ativo);
  const paid = ativos.filter((t) => t.valor > 0);
  const vagas = ativos.reduce((sum, t) => sum + (Number(t.quantidade) || 0), 0);
  const valor =
    paid[0]?.valor ??
    ativos.find((t) => t.key === 'inteira')?.valor ??
    ativos[0]?.valor ??
    0;
  const gratuito = ativos.length > 0 && ativos.every((t) => t.valor === 0);

  const imagens = [...(data.imagens ?? [])].sort((a, b) => a.order - b.order);
  const cover = imagens.find((i) => i.isCover) ?? imagens[0];
  const galeria = imagens.filter((i) => !i.isCover).map((i) => i.url);

  return {
    ...data,
    valor,
    vagas,
    gratuito,
    banner: cover?.url || data.banner || '',
    galeria,
    imagens: imagens.map((img, index) => ({
      ...img,
      order: index,
      isCover: cover ? img.id === cover.id : index === 0,
    })),
    patrocinadoresVinculados: normalizeLinks(data.patrocinadoresVinculados),
    instituicoesVinculadas: normalizeLinks(data.instituicoesVinculadas),
  };
}

function normalizeLinks(links?: EventEntityLink[]): EventEntityLink[] {
  return [...(links ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((link, ordem) => ({ id: link.id, ordem }));
}

type RawEvent = Partial<Event> & {
  patrocinadores?: LegacyEmbeddedSponsor[];
};

export function normalizeEvent(raw: RawEvent): Event {
  const base = createEmptyEventForm();
  const tipos =
    raw.tiposIngresso && raw.tiposIngresso.length > 0
      ? raw.tiposIngresso.map(normalizeTicketType)
      : migrateLegacyTickets(raw);

  const imagens: GalleryImage[] =
    raw.imagens && raw.imagens.length > 0 ? raw.imagens : migrateLegacyGallery(raw);

  const patrocinadoresVinculados = resolveSponsorLinks(raw);
  const instituicoesVinculadas = normalizeLinks(raw.instituicoesVinculadas);

  const synced = syncDerivedEventFields({
    ...base,
    ...raw,
    tiposIngresso: tipos,
    imagens,
    patrocinadoresVinculados,
    instituicoesVinculadas,
    subtitulo: raw.subtitulo ?? '',
    categoria: raw.categoria ?? '',
    cidade: raw.cidade ?? '',
    cep: raw.cep ?? '',
    regulamento: raw.regulamento ?? '',
    permitirCompraOnline: raw.permitirCompraOnline ?? raw.permitirInscricao ?? true,
    permitirRetiradaGratuita: raw.permitirRetiradaGratuita ?? false,
    exibirPatrocinadores: raw.exibirPatrocinadores ?? true,
    exibirInstituicoes: raw.exibirInstituicoes ?? true,
    exibirMapa: raw.exibirMapa ?? true,
    exibirGaleria: raw.exibirGaleria ?? true,
  });

  return {
    ...synced,
    id: raw.id ?? createId('evt'),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  } as Event;
}

function resolveSponsorLinks(raw: RawEvent): EventEntityLink[] {
  if (raw.patrocinadoresVinculados && raw.patrocinadoresVinculados.length > 0) {
    return normalizeLinks(raw.patrocinadoresVinculados);
  }

  const embedded = raw.patrocinadores ?? [];
  if (embedded.length === 0) return [];

  return normalizeLinks(
    embedded.map((p, index) => ({
      id: p.id,
      ordem: p.ordem ?? index,
    }))
  );
}

function normalizeTicketType(t: Partial<TicketType> & Pick<TicketType, 'id' | 'key' | 'nome'>): TicketType {
  return {
    id: t.id,
    key: t.key,
    nome: t.nome,
    descricao: typeof t.descricao === 'string' ? t.descricao : '',
    ativo: Boolean(t.ativo),
    valor: Math.max(0, Number(t.valor) || 0),
    quantidade: Math.max(0, Math.floor(Number(t.quantidade) || 0)),
  };
}

function migrateLegacyTickets(raw: Partial<Event>): TicketType[] {
  const eid = raw.id ?? 'tmp';
  const base = (key: string, nome: string): TicketType => ({
    id: `tt-${eid}-${key}`,
    key,
    nome,
    descricao: '',
    ativo: false,
    valor: 0,
    quantidade: 0,
  });

  const inteira = base('inteira', 'Inteira');
  const meia = base('meia', 'Meia-Entrada');
  const retirada = base('retirada', 'Retirada');

  if (raw.gratuito) {
    return [
      inteira,
      meia,
      { ...retirada, ativo: true, valor: 0, quantidade: raw.vagas ?? 100 },
    ];
  }

  return [
    {
      ...inteira,
      ativo: true,
      valor: raw.valor ?? 0,
      quantidade: raw.vagas ?? 100,
    },
    meia,
    retirada,
  ];
}

function migrateLegacyGallery(raw: Partial<Event>): GalleryImage[] {
  const images: GalleryImage[] = [];
  if (raw.banner) {
    images.push({
      id: createId('img'),
      url: raw.banner,
      isCover: true,
      order: 0,
      name: 'Capa',
    });
  }
  (raw.galeria ?? []).forEach((url, index) => {
    images.push({
      id: createId('img'),
      url,
      isCover: images.length === 0 && index === 0,
      order: images.length,
    });
  });
  return images;
}

export const EVENT_CATEGORIES = [
  'Beneficente',
  'Esportivo',
  'Cultural',
  'Educacional',
  'Institucional',
  'Gastronômico',
  'Outro',
] as const;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_IMAGE_EXT = '.jpg,.jpeg,.png,.webp';
export const MAX_IMAGE_SIZE_MB = 5;

export const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;
