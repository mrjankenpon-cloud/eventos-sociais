import * as functions from 'firebase-functions/v1';
import { getAppUrl } from '../mp/helpers';
import { liveRef, pctOf, RESEND_FREE } from '../usage/quota';

/**
 * Cliente Resend — secrets só em Functions (nunca VITE_*).
 *
 *   RESEND_API_KEY
 *   EMAIL_FROM
 *   APP_URL
 *
 * Sem API Key: não falha o fluxo de compra — apenas registra e enfileira.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type ResendQuota = {
  emailsToday: number | null;
  emailsMonth: number | null;
};

export function isResendConfigured(): boolean {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  return Boolean(key) && !key.startsWith('re_xxxxxxxx');
}

export function getEmailFrom(): string {
  return (
    String(process.env.EMAIL_FROM || '').trim() ||
    'DELPHOS <ingressos@institutodelphos.com.br>'
  );
}

function parseQuotaHeader(res: Response, name: string): number | null {
  const raw = res.headers.get(name);
  if (!raw) return null;
  const n = Number(String(raw).split(/[/\s]/)[0].replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function readResendQuota(res: Response): ResendQuota {
  return {
    emailsToday: parseQuotaHeader(res, 'x-resend-daily-quota'),
    emailsMonth: parseQuotaHeader(res, 'x-resend-monthly-quota'),
  };
}

async function persistResendQuota(quota: ResendQuota): Promise<void> {
  if (quota.emailsToday == null && quota.emailsMonth == null) return;
  try {
    await liveRef().set(
      {
        emailsToday: quota.emailsToday,
        emailsMonth: quota.emailsMonth,
        emailsDayPct: pctOf(quota.emailsToday, RESEND_FREE.emailsDay),
        emailsMonthPct: pctOf(quota.emailsMonth, RESEND_FREE.emailsMonth),
        emailsUpdatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    functions.logger.warn('[resend] persistir cota', err);
  }
}

export async function fetchResendUsage(): Promise<ResendQuota> {
  const empty: ResendQuota = { emailsToday: null, emailsMonth: null };
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('re_xxxxxxxx')) return empty;
  try {
    const res = await fetch('https://api.resend.com/emails?limit=1', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const quota = readResendQuota(res);
    if (!res.ok && quota.emailsToday == null && quota.emailsMonth == null) {
      functions.logger.warn('[resend] cota', { status: res.status });
      return empty;
    }
    if (quota.emailsToday == null) {
      quota.emailsToday = await countEmailsSince(
        apiKey,
        Date.now() - 24 * 60 * 60 * 1000,
        2
      );
    }
    await persistResendQuota(quota);
    return quota;
  } catch (err) {
    functions.logger.warn('[resend] cota', err);
    return empty;
  }
}

async function countEmailsSince(
  apiKey: string,
  sinceMs: number,
  maxPages: number
): Promise<number | null> {
  let after: string | undefined;
  let total = 0;
  try {
    for (let page = 0; page < maxPages; page++) {
      const url = new URL('https://api.resend.com/emails');
      url.searchParams.set('limit', '100');
      if (after) url.searchParams.set('after', after);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return total || null;
      const json = (await res.json()) as {
        has_more?: boolean;
        data?: Array<{ id?: string; created_at?: string }>;
      };
      const data = json.data || [];
      if (!data.length) return total;
      let older = false;
      for (const item of data) {
        const t = Date.parse(String(item.created_at || ''));
        if (!Number.isFinite(t)) continue;
        if (t >= sinceMs) total += 1;
        else older = true;
      }
      if (!json.has_more || older) return total;
      after = data[data.length - 1]?.id;
      if (!after) return total;
    }
    return total;
  } catch {
    return total || null;
  }
}

export async function sendEmailViaResend(
  input: SendEmailInput
): Promise<{ sent: boolean; id?: string; queued?: boolean }> {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = getEmailFrom();

  if (!apiKey || apiKey.startsWith('re_xxxxxxxx')) {
    functions.logger.warn('[resend] RESEND_API_KEY ausente — e-mail enfileirado', {
      to: input.to,
      subject: input.subject,
      appUrl: getAppUrl(),
    });
    return { sent: false, queued: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tags,
    }),
  });

  void persistResendQuota(readResendQuota(res));

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!res.ok) {
    functions.logger.error('[resend] falha no envio', {
      status: res.status,
      message: body.message,
      to: input.to,
    });
    throw new Error(body.message || `Resend HTTP ${res.status}`);
  }

  functions.logger.info('[resend] enviado', { id: body.id, to: input.to });
  return { sent: true, id: body.id };
}
