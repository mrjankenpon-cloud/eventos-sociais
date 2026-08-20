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
 *
 * Cota gratuita de envio: janela móvel de 24h (100), não dia civil à 00h00.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type ResendQuota = {
  /** Alias compatível: usados na janela móvel de 24h. */
  emailsToday: number | null;
  emailsMonth: number | null;
  emailsWindowUsed: number | null;
  emailsWindowRemaining: number | null;
  emailsNextReleaseAt: string | null;
  emailsNextReleaseCount: number | null;
};

function emptyQuota(): ResendQuota {
  return {
    emailsToday: null,
    emailsMonth: null,
    emailsWindowUsed: null,
    emailsWindowRemaining: null,
    emailsNextReleaseAt: null,
    emailsNextReleaseCount: null,
  };
}

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

function applyWindowFields(
  quota: ResendQuota,
  window: RollingWindowStats | null
): ResendQuota {
  if (!window) return quota;
  const used = window.used;
  const remaining = Math.max(0, RESEND_FREE.emailsWindow - used);
  return {
    ...quota,
    emailsToday: used,
    emailsWindowUsed: used,
    emailsWindowRemaining: remaining,
    emailsNextReleaseAt: window.nextReleaseAt,
    emailsNextReleaseCount: window.nextReleaseCount,
  };
}

type RollingWindowStats = {
  used: number;
  nextReleaseAt: string | null;
  nextReleaseCount: number | null;
};

/**
 * Conta envios na janela móvel e calcula quando a capacidade começa a liberar
 * (created_at do mais antigo na janela + 24h).
 */
async function analyzeRollingWindow(
  apiKey: string,
  nowMs = Date.now()
): Promise<RollingWindowStats | null> {
  const sinceMs = nowMs - WINDOW_MS;
  const timestamps: number[] = [];
  let after: string | undefined;

  try {
    // Teto 100/24h — uma página costuma bastar; segunda página só se necessário.
    for (let page = 0; page < 2; page++) {
      const url = new URL('https://api.resend.com/emails');
      url.searchParams.set('limit', '100');
      if (after) url.searchParams.set('after', after);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return timestamps.length ? summarizeWindow(timestamps, nowMs) : null;

      const json = (await res.json()) as {
        has_more?: boolean;
        data?: Array<{ id?: string; created_at?: string }>;
      };
      const data = json.data || [];
      if (!data.length) break;

      let older = false;
      for (const item of data) {
        const t = Date.parse(String(item.created_at || ''));
        if (!Number.isFinite(t)) continue;
        if (t >= sinceMs) timestamps.push(t);
        else older = true;
      }
      if (!json.has_more || older) break;
      after = data[data.length - 1]?.id;
      if (!after) break;
    }

    return summarizeWindow(timestamps, nowMs);
  } catch {
    return timestamps.length ? summarizeWindow(timestamps, nowMs) : null;
  }
}

function summarizeWindow(
  timestamps: number[],
  nowMs: number
): RollingWindowStats {
  if (!timestamps.length) {
    return { used: 0, nextReleaseAt: null, nextReleaseCount: null };
  }

  const oldest = Math.min(...timestamps);
  const nextReleaseMs = oldest + WINDOW_MS;
  // Quantos envios liberam no mesmo instante (mesmo created_at / mesmo segundo).
  const nextReleaseCount = timestamps.filter((t) => t === oldest).length;

  return {
    used: timestamps.length,
    nextReleaseAt:
      nextReleaseMs > nowMs ? new Date(nextReleaseMs).toISOString() : null,
    nextReleaseCount: nextReleaseMs > nowMs ? nextReleaseCount : null,
  };
}

async function persistResendQuota(quota: ResendQuota): Promise<void> {
  if (
    quota.emailsWindowUsed == null &&
    quota.emailsToday == null &&
    quota.emailsMonth == null
  ) {
    return;
  }
  const used =
    quota.emailsWindowUsed != null ? quota.emailsWindowUsed : quota.emailsToday;
  const remaining =
    quota.emailsWindowRemaining != null
      ? quota.emailsWindowRemaining
      : used != null
        ? Math.max(0, RESEND_FREE.emailsWindow - used)
        : null;

  try {
    await liveRef().set(
      {
        emailsToday: used,
        emailsMonth: quota.emailsMonth,
        emailsWindowUsed: used,
        emailsWindowRemaining: remaining,
        emailsNextReleaseAt: quota.emailsNextReleaseAt,
        emailsNextReleaseCount: quota.emailsNextReleaseCount,
        emailsDayPct: pctOf(used, RESEND_FREE.emailsWindow),
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
  const empty = emptyQuota();
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('re_xxxxxxxx')) return empty;

  try {
    const res = await fetch('https://api.resend.com/emails?limit=1', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const headerMonth = parseQuotaHeader(res, 'x-resend-monthly-quota');
    // Header "daily" existe, mas a UI/reativação usam a janela móvel via listagem.
    if (!res.ok && headerMonth == null) {
      functions.logger.warn('[resend] cota', { status: res.status });
    }

    const window = await analyzeRollingWindow(apiKey);
    let quota = applyWindowFields(
      { ...empty, emailsMonth: headerMonth },
      window
    );

    // Se a listagem falhar, usa o header daily só como fallback de uso.
    if (quota.emailsWindowUsed == null) {
      const headerDaily = parseQuotaHeader(res, 'x-resend-daily-quota');
      if (headerDaily != null) {
        quota = {
          ...quota,
          emailsToday: headerDaily,
          emailsWindowUsed: headerDaily,
          emailsWindowRemaining: Math.max(
            0,
            RESEND_FREE.emailsWindow - headerDaily
          ),
        };
      }
    }

    await persistResendQuota(quota);
    return quota;
  } catch (err) {
    functions.logger.warn('[resend] cota', err);
    return empty;
  }
}

export async function sendEmailViaResend(
  input: SendEmailInput
): Promise<{ sent: boolean; id?: string; queued?: boolean; delayed?: boolean }> {
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

  // Janela móvel esgotada: não parece falha — o app orienta guardar o PDF na tela.
  if (await isResendWindowExhausted()) {
    functions.logger.warn('[resend] janela 24h esgotada — envio adiado', {
      to: input.to,
      subject: input.subject,
    });
    return { sent: false, queued: true, delayed: true };
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

  // Após envio, recalcula a janela (não confiar só no header "daily").
  void (async () => {
    try {
      const month = parseQuotaHeader(res, 'x-resend-monthly-quota');
      const window = await analyzeRollingWindow(apiKey);
      const quota = applyWindowFields(
        { ...emptyQuota(), emailsMonth: month },
        window
      );
      if (quota.emailsWindowUsed == null && month == null) {
        const headerDaily = parseQuotaHeader(res, 'x-resend-daily-quota');
        if (headerDaily != null) {
          await persistResendQuota({
            ...quota,
            emailsToday: headerDaily,
            emailsWindowUsed: headerDaily,
            emailsWindowRemaining: Math.max(
              0,
              RESEND_FREE.emailsWindow - headerDaily
            ),
          });
          return;
        }
      }
      await persistResendQuota(quota);
    } catch (err) {
      functions.logger.warn('[resend] atualizar cota pós-envio', err);
    }
  })();

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!res.ok) {
    const msg = String(body.message || body.name || '');
    const quotaHit =
      res.status === 429 ||
      /quota|rate.?limit|too many/i.test(msg) ||
      /daily_quota|monthly_quota/i.test(msg);

    functions.logger.error('[resend] falha no envio', {
      status: res.status,
      message: body.message,
      to: input.to,
      quotaHit,
    });

    if (quotaHit) {
      return { sent: false, queued: true, delayed: true };
    }

    throw new Error(body.message || `Resend HTTP ${res.status}`);
  }

  functions.logger.info('[resend] enviado', { id: body.id, to: input.to });
  return { sent: true, id: body.id };
}

async function isResendWindowExhausted(): Promise<boolean> {
  try {
    const snap = await liveRef().get();
    const data = snap.data() || {};
    const remaining = data.emailsWindowRemaining;
    if (typeof remaining === 'number' && remaining <= 0) return true;
    const used = Number(data.emailsWindowUsed ?? data.emailsToday);
    if (Number.isFinite(used) && used >= RESEND_FREE.emailsWindow) return true;
  } catch {
    /* ignore — tenta enviar mesmo assim */
  }
  return false;
}
