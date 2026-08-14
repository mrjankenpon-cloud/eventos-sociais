import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';
import { ORG, orgAddressLine } from './orgInfo';
import type {
  AboutSiteContent,
  DonationsSiteContent,
  LegalSiteContent,
  SiteContent,
  SiteContentSection,
} from '../types/models/siteContent';
import { DEFAULT_SITE_CONTENT } from './siteContentDefaults';

const ORG_VARS: Record<string, string> = {
  razaoSocial: ORG.razaoSocial,
  cnpj: ORG.cnpj,
  endereco: orgAddressLine(),
  email: ORG.emailOperacional,
  site: ORG.site,
  dataAbertura: ORG.dataAberturaLabel,
  shortBrand: ORG.shortBrand,
};

/** Substitui {{chave}} pelos dados institucionais fixos. */
export function applyOrgPlaceholders(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => ORG_VARS[key] ?? '');
}

/** Renderiza texto com **negrito** simples (sem HTML livre). */
export function renderRichText(text: string): ReactNode {
  const resolved = applyOrgPlaceholders(text);
  const parts = resolved.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return createElement(
        'strong',
        { key: i, className: 'text-gray-900' },
        part.slice(2, -2)
      );
    }
    return part ? createElement(Fragment, { key: i }, part) : null;
  });
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeSection(raw: unknown): SiteContentSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const title = typeof s.title === 'string' ? s.title.trim() : '';
  if (!title) return null;
  return {
    title,
    paragraphs: asStringArray(s.paragraphs),
    bullets: asStringArray(s.bullets),
  };
}

function normalizeAbout(
  raw: unknown,
  fallback: AboutSiteContent
): AboutSiteContent {
  if (!raw || typeof raw !== 'object') return fallback;
  const a = raw as Partial<AboutSiteContent>;
  return {
    title: a.title?.trim() || fallback.title,
    subtitle: a.subtitle?.trim() || fallback.subtitle,
    introTitle: a.introTitle?.trim() || fallback.introTitle,
    introParagraphs:
      asStringArray(a.introParagraphs).length > 0
        ? asStringArray(a.introParagraphs)
        : fallback.introParagraphs,
    whatWeDoTitle: a.whatWeDoTitle?.trim() || fallback.whatWeDoTitle,
    whatWeDoBullets:
      asStringArray(a.whatWeDoBullets).length > 0
        ? asStringArray(a.whatWeDoBullets)
        : fallback.whatWeDoBullets,
    partnersTitle: a.partnersTitle?.trim() || fallback.partnersTitle,
    partnersIntro: a.partnersIntro?.trim() || fallback.partnersIntro,
    ctaBeforeLink: a.ctaBeforeLink ?? fallback.ctaBeforeLink,
    ctaLinkText: a.ctaLinkText?.trim() || fallback.ctaLinkText,
    ctaAfterLink: a.ctaAfterLink ?? fallback.ctaAfterLink,
  };
}

function normalizeLegal(
  raw: unknown,
  fallback: LegalSiteContent
): LegalSiteContent {
  if (!raw || typeof raw !== 'object') return fallback;
  const l = raw as Partial<LegalSiteContent>;
  const sections = Array.isArray(l.sections)
    ? l.sections
        .map(normalizeSection)
        .filter((s): s is SiteContentSection => Boolean(s))
    : [];
  return {
    title: l.title?.trim() || fallback.title,
    subtitle: l.subtitle?.trim() || fallback.subtitle,
    intro: l.intro?.trim() || fallback.intro,
    sections: sections.length > 0 ? sections : fallback.sections,
  };
}

function normalizeDonations(
  raw: unknown,
  fallback: DonationsSiteContent
): DonationsSiteContent {
  if (!raw || typeof raw !== 'object') return fallback;
  const d = raw as Partial<DonationsSiteContent>;
  return {
    title: d.title?.trim() || fallback.title,
    subtitle: d.subtitle?.trim() || fallback.subtitle,
    intro: d.intro?.trim() || fallback.intro,
    irTitle: d.irTitle?.trim() || fallback.irTitle,
    irParagraphs:
      asStringArray(d.irParagraphs).length > 0
        ? asStringArray(d.irParagraphs)
        : fallback.irParagraphs,
    aceiteBeforeLink: d.aceiteBeforeLink ?? fallback.aceiteBeforeLink,
    aceiteLinkText: d.aceiteLinkText?.trim() || fallback.aceiteLinkText,
    aceiteAfterLink: d.aceiteAfterLink ?? fallback.aceiteAfterLink,
  };
}

/** Mescla documento do Firestore com defaults (nunca deixa página em branco). */
export function normalizeSiteContent(raw: unknown): SiteContent {
  const base =
    raw && typeof raw === 'object' ? (raw as Partial<SiteContent>) : {};
  return {
    about: normalizeAbout(base.about, DEFAULT_SITE_CONTENT.about),
    terms: normalizeLegal(base.terms, DEFAULT_SITE_CONTENT.terms),
    privacy: normalizeLegal(base.privacy, DEFAULT_SITE_CONTENT.privacy),
    donations: normalizeDonations(base.donations, DEFAULT_SITE_CONTENT.donations),
  };
}

export function paragraphsFromTextarea(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

export function bulletsFromTextarea(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);
}

export function paragraphsToTextarea(paragraphs: string[]): string {
  return paragraphs.join('\n\n');
}

export function bulletsToTextarea(bullets: string[]): string {
  return bullets.join('\n');
}
