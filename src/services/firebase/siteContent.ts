import { getDoc, setDoc } from 'firebase/firestore';
import type { SiteContent } from '../../types/models/siteContent';
import { DEFAULT_SITE_CONTENT } from '../../lib/siteContentDefaults';
import { normalizeSiteContent } from '../../lib/siteContent';
import {
  COLLECTIONS,
  docRef,
  stripUndefined,
  timestamps,
  touchUpdated,
  wrapError,
} from './helpers';
import { logsService } from './logs';

const SITE_CONTENT_DOC_ID = 'conteudoSite';

export const siteContentService = {
  async get(): Promise<SiteContent> {
    try {
      const snap = await getDoc(
        docRef(COLLECTIONS.configuracoes, SITE_CONTENT_DOC_ID)
      );
      if (!snap.exists()) return structuredClone(DEFAULT_SITE_CONTENT);
      return normalizeSiteContent(snap.data());
    } catch (error) {
      wrapError('siteContent.get', error);
    }
  },

  async save(content: SiteContent): Promise<SiteContent> {
    try {
      const normalized = normalizeSiteContent(content);
      await setDoc(
        docRef(COLLECTIONS.configuracoes, SITE_CONTENT_DOC_ID),
        {
          ...stripUndefined(normalized as unknown as Record<string, unknown>),
          ...touchUpdated(),
          createdAt: timestamps().createdAt,
        },
        { merge: true }
      );

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.configuracoes,
        documentoId: SITE_CONTENT_DOC_ID,
        descricao: 'Conteúdo das páginas públicas atualizado',
      });

      return normalized;
    } catch (error) {
      wrapError('siteContent.save', error);
    }
  },
};
