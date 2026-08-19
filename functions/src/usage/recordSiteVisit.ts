import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { allowAttempt, isAutomatedClient, requestIp } from '../http/rateLimit';
import { liveRef, quotaDayId } from './quota';

const MAX_COUNTED_SESSIONS_PER_DAY = 12_000;

/**
 * Conta 1 visita de sessão no site público.
 * Ignora crawlers, limita por IP e para de escrever se o dia já estiver saturado.
 */
export const recordSiteVisit = onRequest(
  { region: 'us-central1', cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (isAutomatedClient(req)) {
      res.status(204).send('');
      return;
    }

    const ip = requestIp(req);
    if (!allowAttempt(`visit:${ip}`, 2, 30 * 60 * 1000)) {
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
        if (sessions >= MAX_COUNTED_SESSIONS_PER_DAY) return;
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
