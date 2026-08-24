import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { usePageSeo } from '../../hooks/usePageSeo';
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  PUBLIC_PAGE_SEO,
  SEO_TITLE_SUFFIX,
} from '../../lib/seo';

export type SeoOverride = {
  title: string;
  description: string;
  noIndex?: boolean;
  image?: string;
  jsonLd?: Record<string, unknown> | null;
};

const SeoOverrideContext = createContext<(next: SeoOverride | null) => void>(
  () => undefined
);

export function useSeoOverride(override: SeoOverride | null) {
  const setOverride = useContext(SeoOverrideContext);
  const jsonLdKey = override?.jsonLd ? JSON.stringify(override.jsonLd) : '';

  useEffect(() => {
    setOverride(override);
    return () => setOverride(null);
    // Campos primitivos evitam loop quando o pai recria o objeto.
  }, [
    setOverride,
    override?.title,
    override?.description,
    override?.noIndex,
    override?.image,
    jsonLdKey,
  ]);
}

const NOINDEX_PATTERNS = [
  '/evento/:id/inscricao',
  '/pedido/:id/sucesso',
  '/pedido/consultar',
  '/meus-ingressos',
  '/doacao/:id/sucesso',
];

/**
 * Title/description no primeiro paint da rota pública.
 * Páginas de evento podem complementar com useSeoOverride.
 */
export function PublicSeo({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [override, setOverride] = useState<SeoOverride | null>(null);

  const exact = PUBLIC_PAGE_SEO.find((page) =>
    matchPath({ path: page.path, end: true }, pathname)
  );
  const noIndex = NOINDEX_PATTERNS.some((pattern) =>
    matchPath({ path: pattern, end: true }, pathname)
  );
  const isEventPage = Boolean(
    matchPath({ path: '/evento/:id', end: true }, pathname)
  );

  usePageSeo({
    title:
      override?.title ||
      exact?.title ||
      (isEventPage ? `Evento beneficente | ${SEO_TITLE_SUFFIX}` : HOME_TITLE),
    description: override?.description || exact?.description || HOME_DESCRIPTION,
    path: pathname,
    noIndex: override?.noIndex ?? noIndex,
    image: override?.image,
    jsonLd: override?.jsonLd,
  });

  const setter = useMemo(() => setOverride, []);

  return (
    <SeoOverrideContext.Provider value={setter}>
      {children}
    </SeoOverrideContext.Provider>
  );
}
