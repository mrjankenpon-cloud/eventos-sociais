import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import webpush from 'web-push';
import { getAppUrl } from './mp/helpers';

const TOPIC_MAIL = 'mailto:ingressos@institutodelphos.com.br';

type PushDoc = {
  endpoint?: string;
  p256dh?: string;
  auth?: string;
};

function configureVapid(): boolean {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = String(process.env.VAPID_SUBJECT || '').trim() || TOPIC_MAIL;
  if (!publicKey || !privateKey) {
    console.warn('[notifyNewEvent] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ausentes');
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

/** Dispara Web Push quando o admin marca "Enviar notificação" num evento publicado. */
export const notifyNewEvent = functions.firestore
  .document('eventos/{eventoId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : undefined;
    if (!after) return;

    if (!isPublished(after) || after.enviarNotificacao !== true) return;
    if (typeof after.notificacaoEnviadaEm === 'string' && after.notificacaoEnviadaEm) {
      return;
    }

    if (!configureVapid()) return;

    const eventoId = context.params.eventoId as string;
    const titulo = String(after.titulo || 'Novo evento').trim();
    const body = String(after.resumo || after.descricaoCurta || '').trim();
    const url = `${getAppUrl()}/evento/${eventoId}`;
    const payload = JSON.stringify({
      title: `DELPHOS · ${titulo}`,
      body: body || 'Um novo evento está no ar. Abra o app para conferir.',
      url,
    });

    const snap = await admin.firestore().collection('pushTokens').get();
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
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          removals.push(doc.id);
        } else {
          console.warn('[notifyNewEvent] falha ao enviar', doc.id, error);
        }
      }
    }

    const batch = admin.firestore().batch();
    batch.update(change.after.ref, {
      notificacaoEnviadaEm: new Date().toISOString(),
    });
    for (const id of removals) {
      batch.delete(admin.firestore().collection('pushTokens').doc(id));
    }
    await batch.commit();
  });
