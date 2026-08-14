import { useCallback, useEffect, useState } from 'react';
import type { SiteContent } from '../types/models/siteContent';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';
import { siteContentService } from '../services/firebase/siteContent';

/** Carrega o conteúdo público com fallback para os textos padrão. */
export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await siteContentService.get();
      setContent(data);
    } catch (error) {
      console.warn('Não foi possível carregar o conteúdo do site:', error);
      setContent(structuredClone(DEFAULT_SITE_CONTENT));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { content, loading, reload };
}
