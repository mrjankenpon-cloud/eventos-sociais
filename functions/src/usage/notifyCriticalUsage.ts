import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendEmailViaResend } from '../email/resend';
import { getAppUrl } from '../mp/helpers';
import { FREE_DAILY, RESEND_FREE, type UsageLevel } from './quota';

const APPROVER =
  String(process.env.ACCESS_APPROVER_EMAIL || '').trim() ||
  'augustovogel82@gmail.com';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function adminEmails(): Promise<string[]> {
  const snap = await admin.firestore().collection('usuarios').get();
  const emails = new Set<string>();
  if (isEmail(APPROVER)) emails.add(APPROVER.toLowerCase());

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (data.ativo === false) continue;
    const role = String(data.role || '');
    const master = data.master === true;
    if (!master && role !== 'admin') continue;
    const email = String(data.email || '')
      .trim()
      .toLowerCase();
    if (isEmail(email)) emails.add(email);
  }
  return [...emails];
}

function line(
  label: string,
  used: number | null,
  cap: number,
  pct: number
): string {
  const n = used == null ? '—' : Math.round(used).toLocaleString('pt-BR');
  return `${label}: ${n} de ${cap.toLocaleString('pt-BR')} (${pct}%)`;
}

export async function notifyAdminsIfCriticalUsage(params: {
  quotaDay: string;
  alreadyAlertedDay?: string;
  overall: UsageLevel;
  monitoringOk: boolean;
  emailsKnown: boolean;
  reads: number | null;
  writes: number | null;
  deletes: number | null;
  readsPct: number;
  writesPct: number;
  deletesPct: number;
  emailsToday: number | null;
  emailsMonth: number | null;
  emailsDayPct: number;
  emailsMonthPct: number;
}): Promise<boolean> {
  if (params.overall !== 'hot') return false;
  if (!params.monitoringOk && !params.emailsKnown) return false;
  if (params.alreadyAlertedDay === params.quotaDay) return false;

  const to = await adminEmails();
  if (!to.length) {
    functions.logger.warn('[usage] alerta crítico sem e-mail de admin');
    return false;
  }

  const panelUrl = `${getAppUrl()}/controle/painel`;
  const readsLine = line(
    'Leituras',
    params.reads,
    FREE_DAILY.reads,
    params.readsPct
  );
  const writesLine = line(
    'Escritas',
    params.writes,
    FREE_DAILY.writes,
    params.writesPct
  );
  const deletesLine = line(
    'Exclusões',
    params.deletes,
    FREE_DAILY.deletes,
    params.deletesPct
  );
  const emailsDayLine = line(
    'E-mails hoje (Resend)',
    params.emailsToday,
    RESEND_FREE.emailsDay,
    params.emailsDayPct
  );
  const emailsMonthLine = line(
    'E-mails no mês (Resend)',
    params.emailsMonth,
    RESEND_FREE.emailsMonth,
    params.emailsMonthPct
  );
  const subject =
    '[DELPHOS] Uso em nível crítico (80% da faixa gratuita)';
  const html = `
    <p>O uso chegou ao <strong>nível crítico</strong>
    (80% ou mais da faixa gratuita de banco ou de e-mails Resend).</p>
    <p>${escapeHtml(readsLine)}<br/>
    ${escapeHtml(writesLine)}<br/>
    ${escapeHtml(deletesLine)}<br/>
    ${escapeHtml(emailsDayLine)}<br/>
    ${escapeHtml(emailsMonthLine)}</p>
    <p>Acompanhe o painel:
    <a href="${escapeHtml(panelUrl)}">${escapeHtml(panelUrl)}</a></p>
    <p>Este aviso é enviado no máximo uma vez por dia de cota
    (meia-noite no horário do Pacífico).</p>
  `;
  const text = [
    'DELPHOS — uso em nível crítico',
    readsLine,
    writesLine,
    deletesLine,
    emailsDayLine,
    emailsMonthLine,
    `Painel: ${panelUrl}`,
  ].join('\n');

  for (const email of to) {
    try {
      await sendEmailViaResend({
        to: email,
        subject,
        html,
        text,
        tags: [{ name: 'type', value: 'usage_critical' }],
      });
    } catch (err) {
      functions.logger.warn('[usage] e-mail crítico', {
        to: email,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  functions.logger.info('[usage] alerta crítico enviado', {
    quotaDay: params.quotaDay,
    recipients: to.length,
  });
  return true;
}
