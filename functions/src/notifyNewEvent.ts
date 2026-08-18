import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import webpush from 'web-push';
import { db, getAppUrl } from './mp/helpers';

const TOPIC_MAIL = 'mailto:ingressos@institutodelphos.com.br';
const MASTER_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';

type PushDoc = {
  endpoint?: string;
  p256dh?: string;
  auth?: string;
};

type SendResult = {
  sent: number;
  tokens: number;
  removals: number;
  errors: string[];
};

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function requireStaff(req: functions.Request): Promise<string> {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Autenticação obrigatória');

  const decoded = await admin.auth().verifyIdToken(match[1]);
  if (decoded.uid === MASTER_UID || decoded.master === true) {
    return decoded.uid;
  }
  const role = String(decoded.role || '');
  if (
    ['admin', 'editor', 'operador'].includes(role) &&
    decoded.ativo !== false
  ) {
    return decoded.uid;
  }

  const userSnap = await db().collection('usuarios').doc(decoded.uid).get();
  const user = userSnap.data();
  if (
    user &&
    user.ativo !== false &&
    ['admin', 'editor', 'operador'].includes(String(user.role || ''))
  ) {
    return decoded.uid;
  }
  throw new Error('Sem permissão');
}

function configureVapid(): boolean {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = String(process.env.VAPID_SUBJECT || '').trim() || TOPIC_MAIL;
  if (!publicKey || !privateKey) {
    functions.logger.error(
      '[sendEventNotification] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ausentes'
    );
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function isPublished(data: admin.firestore.DocumentData | undefined): boolean {
  if (!data) return false;
  if (data.arquivado === true || data.status === 'arquivado') return false;
  return data.status === 'publicado' || data.publicado === true;
}

async function sendEventPush(eventoId: string): Promise<SendResult> {
  const result: SendResult = { sent: 0, tokens: 0, removals: 0, errors: [] };
  if (!configureVapid()) {
    result.errors.push('Chaves VAPID ausentes no servidor');
    return result;
  }

  const snapEvento = await db().collection('eventos').doc(eventoId).get();
  if (!snapEvento.exists) {
    result.errors.push('Evento não encontrado');
    return result;
  }
  const after = snapEvento.data() || {};
  if (!isPublished(after)) {
    result.errors.push('Publique o evento para enviar o aviso');
    return result;
  }

  const titulo = String(after.titulo || 'Novo evento').trim();
  const body = String(after.resumo || after.descricaoCurta || '').trim();
  const url = `${getAppUrl()}/evento/${eventoId}`;
  const payload = JSON.stringify({
    title: `DELPHOS · ${titulo}`,
    body: body || 'Um novo evento está no ar. Abra o app para conferir.',
    url,
  });

  const snap = await db().collection('pushTokens').get();
  result.tokens = snap.size;
  if (snap.empty) return result;

  const removals: string[] = [];

  for (const doc of snap.docs) {
    const data = doc.data() as PushDoc;
    if (!data.endpoint || !data.p256dh || !data.auth) {
      removals.push(doc.id);
      continue;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: data.endpoint,
          keys: { p256dh: data.p256dh, auth: data.auth },
        },
        payload
      );
      result.sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      const msg = error instanceof Error ? error.message : String(error);
      functions.logger.warn('[sendEventNotification] falha ao enviar', {
        id: doc.id,
        status,
        msg,
      });
      if (status === 404 || status === 410) {
        removals.push(doc.id);
      } else {
        result.errors.push(msg);
      }
    }
  }

  result.removals = removals.length;
  const batch = db().batch();
  if (result.sent > 0) {
    batch.update(snapEvento.ref, {
      notificacaoEnviadaEm: new Date().toISOString(),
      enviarNotificacao: true,
    });
  }
  for (const id of removals) {
    batch.delete(db().collection('pushTokens').doc(id));
  }
  if (result.sent > 0 || removals.length > 0) {
    await batch.commit();
  }

  functions.logger.info('[sendEventNotification] resultado', {
    eventoId,
    ...result,
  });
  return result;
}

/**
 * Admin dispara o aviso ao salvar o evento (não depende só do trigger).
 */
export const sendEventNotification = functions.https.onRequest(
  async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    try {
      await requireStaff(req);
      const eventoId = String(
        (req.body || {}).eventoId || ''
      ).trim();
      if (!eventoId) {
        res.status(400).json({ error: 'eventoId obrigatório' });
        return;
      }
      const result = await sendEventPush(eventoId);
      res.json({ ok: true, ...result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao enviar';
      functions.logger.error('[sendEventNotification]', error);
      const statusCode =
        msg.includes('Autenticação') || msg.includes('permissão') ? 403 : 500;
      res.status(statusCode).json({ error: msg });
    }
  }
);
