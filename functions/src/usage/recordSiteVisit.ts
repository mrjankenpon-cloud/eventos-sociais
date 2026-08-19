import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { liveRef, quotaDayId } from './quota';

/**
 * Conta 1 visita de sessão no site público.
 * Barato: 1 escrita por navegador/aba (o cliente só chama uma vez).
 */
export const recordSiteVisit = onRequest(
  { region: 'us-central1', cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const day = quotaDayId();
      const ref = liveRef();
      await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const prev = snap.data() || {};
        const sameDay = String(prev.quotaDay || '') === day;
        const sessions = sameDay ? Number(prev.siteSessionsToday) || 0 : 0;
        tx.set(
          ref,
          {
            quotaDay: day,
            siteSessionsToday: sessions + 1,
            lastVisitAt: new Date().toISOString(),
          },
          { merge: true }
        );
      });
      res.status(204).send('');
    } catch (error) {
      logger.warn('[recordSiteVisit]', error);
      res.status(204).send('');
    }
  }
);
