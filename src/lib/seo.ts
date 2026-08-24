import { ORG, orgAddressLine } from './orgInfo';

export const SITE_ORIGIN = ORG.site;
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/delphos-logo.png`;
export const SEO_TITLE_SUFFIX = 'Instituto Delphos';

export const HOME_TITLE = `Eventos beneficentes | ${SEO_TITLE_SUFFIX}`;
export const HOME_DESCRIPTION =
  'Eventos beneficentes do Instituto Delphos em Barueri/SP. Veja a programação, compre ingressos e apoie instituições parceiras com doações.';

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  image?: string;
};

export const PUBLIC_PAGE_SEO: PageSeo[] = [
  {
    path: '/',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  {
    path: '/sobre',
    title: `Sobre o Instituto Delphos | Eventos beneficentes`,
    description:
      'Conheça o Instituto Delphos: organização em Barueri que promove eventos beneficentes, ingressos solidários e apoio a instituições parceiras.',
  },
  {
    path: '/doacoes',
    title: `Doações para eventos beneficentes | ${SEO_TITLE_SUFFIX}`,
    description:
      'Doe ao Instituto Delphos e ajude a manter eventos beneficentes e o apoio a instituições parceiras. PIX ou cartão, com certificado de doação.',
  },
  {
    path: '/termos',
    title: `Termo de Uso | ${SEO_TITLE_SUFFIX}`,
    description:
      'Condições de uso do site do Instituto Delphos para inscrição em eventos beneficentes, compra de ingressos e doações.',
  },
  {
    path: '/privacidade',
    title: `Privacidade | ${SEO_TITLE_SUFFIX}`,
    description:
      'Como o Instituto Delphos trata dados pessoais em inscrições de eventos beneficentes, ingressos e doações, em linha com a LGPD.',
  },
];

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${normalized}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceMetaContent(
  html: string,
  attr: 'name' | 'property',
  key: string,
  value: string
): string {
  const escaped = escapeHtml(value);
  const namedFirst = new RegExp(
    `(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`,
    'i'
  );
  if (namedFirst.test(html)) return html.replace(namedFirst, `$1${escaped}$2`);
  const contentFirst = new RegExp(
    `(<meta\\s+content=")[^"]*("\\s+${attr}="${key}")`,
    'i'
  );
  return html.replace(contentFirst, `$1${escaped}$2`);
}

/** Ajusta title/description/canonical no HTML estático (crawlers sem JS). */
export function applyStaticSeoToHtml(html: string, page: PageSeo): string {
  const url = absoluteUrl(page.path);
  const title = page.title;
  const description = page.description;
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  out = replaceMetaContent(out, 'name', 'description', description);
  out = replaceMetaContent(out, 'property', 'og:title', title);
  out = replaceMetaContent(out, 'property', 'og:description', description);
  out = replaceMetaContent(out, 'property', 'og:url', url);
  out = replaceMetaContent(out, 'name', 'twitter:title', title);
  out = replaceMetaContent(out, 'name', 'twitter:description', description);
  out = out.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`
  );
  out = out.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    `<noscript>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <ul>
        <li><a href="/">Eventos beneficentes</a></li>
        <li><a href="/sobre">Sobre o Instituto Delphos</a></li>
        <li><a href="/doacoes">Doações para eventos beneficentes</a></li>
      </ul>
    </noscript>`
  );
  return out;
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'NGO'],
        '@id': `${SITE_ORIGIN}/#organizacao`,
        name: ORG.brand,
        alternateName: [ORG.shortBrand, ORG.razaoSocial],
        url: SITE_ORIGIN,
        logo: DEFAULT_OG_IMAGE,
        email: ORG.emailOperacional,
        telephone: ORG.telefone,
        taxID: ORG.cnpj,
        address: {
          '@type': 'PostalAddress',
          streetAddress: `${ORG.endereco.logradouro}, ${ORG.endereco.numero}`,
          addressLocality: ORG.endereco.cidade,
          addressRegion: ORG.endereco.uf,
          postalCode: ORG.endereco.cep,
          addressCountry: 'BR',
        },
        description: HOME_DESCRIPTION,
        foundingDate: ORG.dataAbertura,
        areaServed: {
          '@type': 'City',
          name: ORG.endereco.cidade,
          containedInPlace: {
            '@type': 'State',
            name: 'São Paulo',
          },
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: SITE_ORIGIN,
        name: 'Instituto Delphos',
        alternateName: 'DELPHOS eventos beneficentes',
        description: HOME_DESCRIPTION,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${SITE_ORIGIN}/#organizacao` },
      },
    ],
  };
}

export function eventJsonLd(input: {
  id: string;
  titulo: string;
  descricao?: string;
  data?: string;
  horaInicio?: string;
  local?: string;
  endereco?: string;
  cidade?: string;
  banner?: string;
}): Record<string, unknown> {
  const start =
    input.data && /^\d{4}-\d{2}-\d{2}$/.test(input.data)
      ? `${input.data}T${
          input.horaInicio && /^\d{2}:\d{2}/.test(input.horaInicio)
            ? input.horaInicio.slice(0, 5)
            : '00:00'
        }:00-03:00`
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.titulo,
    description:
      input.descricao?.trim() ||
      `Evento beneficente do Instituto Delphos: ${input.titulo}.`,
    url: absoluteUrl(`/evento/${input.id}`),
    image: input.banner || DEFAULT_OG_IMAGE,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    startDate: start,
    location: {
      '@type': 'Place',
      name: input.local || ORG.brand,
      address: {
        '@type': 'PostalAddress',
        streetAddress: input.endereco || orgAddressLine(),
        addressLocality: input.cidade || ORG.endereco.cidade,
        addressRegion: 'SP',
        addressCountry: 'BR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: ORG.brand,
      url: SITE_ORIGIN,
    },
  };
}
