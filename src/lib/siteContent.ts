import DOMPurify from 'dompurify';
import { ORG, orgAddressLine } from './orgInfo';
import type {
  LegacyAboutContent,
  LegacyDonationsContent,
  LegacyLegalContent,
  LegacySiteContentSection,
  SiteContent,
  SitePageContent,
} from '../types/models/siteContent';
import { DEFAULT_SITE_CONTENT } from './siteContentDefaults';

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height', 'loading',
  'style', 'class', 'colspan', 'rowspan',
];

// Além dos esquemas usuais, aceita `img:{id}` do banco de imagens interno.
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|data|img):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/** Remove qualquer HTML perigoso antes de renderizar no site público. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}

/** true quando o HTML não tem texto nem imagem (só marcação vazia). */
export function isEmptyHtml(html: string | undefined | null): boolean {
  if (!html) return true;
  const withoutTags = html
    .replace(/<(img|hr|br)[^>]*>/gi, 'x')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return withoutTags.length === 0;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Variáveis {{chave}} usadas no formato antigo, agora resolvidas na migração. */
const LEGACY_ORG_VARS: Record<string, string> = {
  razaoSocial: ORG.razaoSocial,
  cnpj: ORG.cnpj,
  endereco: orgAddressLine(),
  email: ORG.emailOperacional,
  site: ORG.site,
  dataAbertura: ORG.dataAberturaLabel,
  shortBrand: ORG.shortBrand,
};

/** Converte **negrito** e {{variáveis}} do formato antigo em HTML final. */
function inlineToHtml(text: string): string {
  const resolved = text.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => LEGACY_ORG_VARS[key] ?? ''
  );
  return escapeHtml(resolved).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function sectionToHtml(section: LegacySiteContentSection): string {
  const parts: string[] = [];
  if (section.title?.trim()) {
    parts.push(`<h2>${inlineToHtml(section.title.trim())}</h2>`);
  }
  if (section.bullets?.length) {
    const items = section.bullets
      .filter((b) => b.trim())
      .map((b) => `<li>${inlineToHtml(b.trim())}</li>`)
      .join('');
    if (items) parts.push(`<ul>${items}</ul>`);
  }
  for (const paragraph of section.paragraphs ?? []) {
    if (paragraph.trim()) parts.push(`<p>${inlineToHtml(paragraph.trim())}</p>`);
  }
  return parts.join('\n');
}

function headerToHtml(title?: string, subtitle?: string): string {
  const parts: string[] = [];
  if (title?.trim()) parts.push(`<h1>${inlineToHtml(title.trim())}</h1>`);
  if (subtitle?.trim()) {
    parts.push(`<p><em>${inlineToHtml(subtitle.trim())}</em></p>`);
  }
  return parts.join('\n');
}

function legacyAboutToHtml(raw: LegacyAboutContent): string {
  const parts = [headerToHtml(raw.title, raw.subtitle)];
  parts.push(
    sectionToHtml({
      title: raw.introTitle,
      paragraphs: raw.introParagraphs,
    })
  );
  parts.push(
    sectionToHtml({
      title: raw.whatWeDoTitle,
      bullets: raw.whatWeDoBullets,
    })
  );
  parts.push(
    sectionToHtml({
      title: raw.partnersTitle,
      paragraphs: raw.partnersIntro ? [raw.partnersIntro] : [],
    })
  );
  return parts.filter(Boolean).join('\n');
}

function legacyLegalToHtml(raw: LegacyLegalContent): string {
  const parts = [headerToHtml(raw.title, raw.subtitle)];
  if (raw.intro?.trim()) parts.push(`<p>${inlineToHtml(raw.intro.trim())}</p>`);
  for (const section of raw.sections ?? []) {
    parts.push(sectionToHtml(section));
  }
  return parts.filter(Boolean).join('\n');
}

function legacyDonationsToHtml(raw: LegacyDonationsContent): string {
  const parts = [headerToHtml(raw.title, raw.subtitle)];
  if (raw.intro?.trim()) parts.push(`<p>${inlineToHtml(raw.intro.trim())}</p>`);
  parts.push(
    sectionToHtml({ title: raw.irTitle, paragraphs: raw.irParagraphs })
  );
  const aceite = [
    raw.aceiteBeforeLink ?? '',
    raw.aceiteLinkText ?? '',
    raw.aceiteAfterLink ?? '',
  ]
    .join('')
    .trim();
  if (aceite) parts.push(`<p>${inlineToHtml(aceite)}</p>`);
  return parts.filter(Boolean).join('\n');
}

type LegacyConverter = (raw: Record<string, unknown>) => string;

const LEGACY_CONVERTERS: Record<keyof SiteContent, LegacyConverter> = {
  about: (raw) => legacyAboutToHtml(raw as LegacyAboutContent),
  terms: (raw) => legacyLegalToHtml(raw as LegacyLegalContent),
  privacy: (raw) => legacyLegalToHtml(raw as LegacyLegalContent),
  donations: (raw) => legacyDonationsToHtml(raw as LegacyDonationsContent),
};

function normalizePage(
  raw: unknown,
  key: keyof SiteContent
): SitePageContent {
  const fallback = DEFAULT_SITE_CONTENT[key];
  if (!raw) return { html: fallback.html };

  if (typeof raw === 'string') {
    return { html: isEmptyHtml(raw) ? fallback.html : raw };
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.html === 'string' && !isEmptyHtml(obj.html)) {
      return { html: obj.html };
    }
    // Documento no formato antigo: converte para HTML sem perder o texto.
    const converted = LEGACY_CONVERTERS[key](obj);
    if (!isEmptyHtml(converted)) return { html: converted };
  }

  return { html: fallback.html };
}

/** Mescla o documento do Firestore com os padrões e migra o formato antigo. */
export function normalizeSiteContent(raw: unknown): SiteContent {
  const base =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    about: normalizePage(base.about, 'about'),
    terms: normalizePage(base.terms, 'terms'),
    privacy: normalizePage(base.privacy, 'privacy'),
    donations: normalizePage(base.donations, 'donations'),
  };
}
