/** Conteúdo livre (HTML do editor) de cada página institucional. */
export interface SitePageContent {
  /** HTML produzido pelo editor rico da área administrativa. */
  html: string;
}

export interface SiteContent {
  about: SitePageContent;
  terms: SitePageContent;
  privacy: SitePageContent;
  donations: SitePageContent;
}

export type SiteContentPageKey = keyof SiteContent;

/** Formato antigo (campos separados), mantido só para migração automática. */
export interface LegacySiteContentSection {
  title?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegacyLegalContent {
  title?: string;
  subtitle?: string;
  intro?: string;
  sections?: LegacySiteContentSection[];
}

export interface LegacyAboutContent {
  title?: string;
  subtitle?: string;
  introTitle?: string;
  introParagraphs?: string[];
  whatWeDoTitle?: string;
  whatWeDoBullets?: string[];
  partnersTitle?: string;
  partnersIntro?: string;
}

export interface LegacyDonationsContent {
  title?: string;
  subtitle?: string;
  intro?: string;
  irTitle?: string;
  irParagraphs?: string[];
  aceiteBeforeLink?: string;
  aceiteLinkText?: string;
  aceiteAfterLink?: string;
}
