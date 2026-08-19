import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { getAppUrl } from '../mp/helpers';
import { sendEmailViaResend } from '../email/resend';

const APPROVER =
  String(process.env.ACCESS_APPROVER_EMAIL || '').trim() ||
  'augustovogel82@gmail.com';
const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000;

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function isGmail(email: string): boolean {
  return /@(gmail|googlemail)\.com$/i.test(email);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function requireUser(req: functions.Request): Promise<admin.auth.DecodedIdToken> {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Autenticação obrigatória');
  return admin.auth().verifyIdToken(match[1]);
}

export const requestPanelAccess = functions.https.onRequest(async (req, res) => {
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
    const decoded = await requireUser(req);
    const email = String(decoded.email || '')
      .trim()
      .toLowerCase();
    const name = String(decoded.name || email.split('@')[0] || 'Solicitante');
    const photoURL = String(decoded.picture || '').trim();

    if (!email.includes('@')) {
      res.status(400).json({ error: 'Conta Google sem e-mail.' });
      return;
    }
    if (!isGmail(email)) {
      res.status(400).json({
        error: 'O painel aceita somente contas Gmail (@gmail.com).',
      });
      return;
    }

    const db = admin.firestore();
    const [byUid, byEmail] = await Promise.all([
      db.collection('usuarios').doc(decoded.uid).get(),
      db.collection('usuarios').doc(email).get(),
    ]);
    const staffDoc = [byUid, byEmail].find((snap) => snap.exists);
    if (staffDoc && staffDoc.data()?.ativo !== false) {
      res.json({ ok: true, alreadyStaff: true });
      return;
    }

    const ref = db.collection('accessRequests').doc(email);
    const existing = await ref.get();
    const prev = existing.data() || {};
    const now = Date.now();
    const lastNotified = Date.parse(String(prev.lastNotifiedAt || '')) || 0;
    const wasPending = String(prev.status || '') === 'pending';
    const skipNotify =
      wasPending && lastNotified > 0 && now - lastNotified < NOTIFY_COOLDOWN_MS;

    const payload = {
      uid: decoded.uid,
      email,
      name,
      photoURL: photoURL || null,
      status: 'pending',
      updatedAt: new Date().toISOString(),
      createdAt: String(prev.createdAt || new Date().toISOString()),
      lastNotifiedAt: skipNotify
        ? prev.lastNotifiedAt || null
        : new Date().toISOString(),
    };

    await ref.set(payload, { merge: true });

    if (!skipNotify) {
      const panelUrl = `${getAppUrl()}/controle/permissoes`;
      await sendEmailViaResend({
        to: APPROVER,
        subject: `[DELPHOS] Pedido de acesso ao painel — ${email}`,
        html: `
          <p>Há um pedido de acesso ao painel administrativo DELPHOS.</p>
          <p><strong>Nome:</strong> ${escapeHtml(name)}<br/>
          <strong>Gmail:</strong> ${escapeHtml(email)}</p>
          <p>Valide em <a href="${escapeHtml(panelUrl)}">${escapeHtml(panelUrl)}</a>
          (aprovar ou recusar em Permissões).</p>
        `,
        text: `Pedido de acesso DELPHOS\nNome: ${name}\nGmail: ${email}\nValidar: ${panelUrl}`,
        tags: [{ name: 'type', value: 'access_request' }],
      }).catch((err) => {
        functions.logger.warn('[requestPanelAccess] e-mail', err);
      });
    }

    res.json({
      ok: true,
      pending: true,
      notified: !skipNotify,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    functions.logger.error('[requestPanelAccess]', error);
    const status = msg.includes('Autenticação') ? 401 : 500;
    res.status(status).json({
      error:
        status === 401
          ? 'Autenticação obrigatória'
          : 'Não foi possível registrar o pedido de acesso',
    });
  }
});
