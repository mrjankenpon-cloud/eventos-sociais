/** Conteúdo editável das páginas públicas institucionais. */

export interface SiteContentSection {
  title: string;
  /** Parágrafos (texto simples; use **negrito** se precisar). */
  paragraphs: string[];
  /** Itens de lista; omitir ou deixar vazio quando não houver. */
  bullets?: string[];
}

export interface AboutSiteContent {
  title: string;
  subtitle: string;
  introTitle: string;
  introParagraphs: string[];
  whatWeDoTitle: string;
  whatWeDoBullets: string[];
  partnersTitle: string;
  partnersIntro: string;
  ctaBeforeLink: string;
  ctaLinkText: string;
  ctaAfterLink: string;
}

export interface LegalSiteContent {
  title: string;
  subtitle: string;
  intro: string;
  sections: SiteContentSection[];
}

export interface DonationsSiteContent {
  title: string;
  subtitle: string;
  intro: string;
  irTitle: string;
  irParagraphs: string[];
  aceiteBeforeLink: string;
  aceiteLinkText: string;
  aceiteAfterLink: string;
}

export interface SiteContent {
  about: AboutSiteContent;
  terms: LegalSiteContent;
  privacy: LegalSiteContent;
  donations: DonationsSiteContent;
}

export type SiteContentPageKey = keyof SiteContent;
