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
 * Cotas:
 * - 100 envios: janela móvel de 24h (não zera à meia-noite).
 * - 3.000/mês: mês civil em UTC (docs Usage API: resets_at = 1º dia 00:00Z).
 *   O header x-resend-monthly-quota acompanha essa cota, mas o painel web
 *   "Last 30 days" mistura meses — por isso contamos via GET /emails.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;
/** Páginas de 100: cobre o teto gratuito mensal (3.000) se necessário. */
const LIST_PAGE_LIMIT = 100;
const LIST_MAX_PAGES = 30;

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
  /** Envios no mês civil atual (UTC), via listagem created_at. */
  emailsMonth: number | null;
  /**
   * Valor bruto do header x-resend-monthly-quota (cota Resend).
   * Pode divergir da contagem civil se houver inbound ou atraso; não usar sozinho como "mês" na UI.
   */
  emailsQuotaHeaderMonth: number | null;
  emailsWindowUsed: number | null;
  emailsWindowRemaining: number | null;
  emailsNextReleaseAt: string | null;
  emailsNextReleaseCount: number | null;
};

function emptyQuota(): ResendQuota {
  return {
    emailsToday: null,
    emailsMonth: null,
    emailsQuotaHeaderMonth: null,
    emailsWindowUsed: null,
    emailsWindowRemaining: null,
    emailsNextReleaseAt: null,
    emailsNextReleaseCount: null,
  };
}

/** Início do mês civil em UTC (alinhado ao resets_at da Usage API Resend). */
export function startOfUtcMonthMs(nowMs = Date.now()): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0);
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

type ListedEmailUsage = {
  window: RollingWindowStats;
  /** Envios com created_at >= 1º dia do mês UTC. */
  monthUsed: number;
};

/**
 * Lista GET /emails (mais recentes primeiro) e deriva:
 * - uso na janela móvel de 24h + próxima liberação;
 * - contagem do mês civil UTC (não confiar no filtro "Last 30 days" do dashboard).
 */
async function analyzeListedEmailUsage(
  apiKey: string,
  nowMs = Date.now()
): Promise<ListedEmailUsage | null> {
  const timestamps: number[] = [];
  let monthUsed = 0;
  const monthStart = startOfUtcMonthMs(nowMs);
  let after: string | undefined;
  let sawAny = false;

  try {
    for (let page = 0; page < LIST_MAX_PAGES; page++) {
      const url = new URL('https://api.resend.com/emails');
      url.searchParams.set('limit', String(LIST_PAGE_LIMIT));
      if (after) url.searchParams.set('after', after);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return sawAny
          ? {
              window: summarizeWindow(timestamps, nowMs),
              monthUsed,
            }
          : null;
      }

      const json = (await res.json()) as {
        has_more?: boolean;
        data?: Array<{ id?: string; created_at?: string }>;
      };
      const data = json.data || [];
      if (!data.length) break;

      let olderThanMonth = false;
      for (const item of data) {
        const t = Date.parse(String(item.created_at || ''));
        if (!Number.isFinite(t)) continue;
        sawAny = true;
        if (t >= monthStart) monthUsed += 1;
        else olderThanMonth = true;
        // Idade estritamente < 24h: no instante oldest+24h a vaga já libera.
        if (nowMs - t < WINDOW_MS) timestamps.push(t);
      }
      // Lista é newest-first: ao passar do 1º do mês UTC, janela 24h também já acabou.
      if (!json.has_more || olderThanMonth) break;
      after = data[data.length - 1]?.id;
      if (!after) break;
    }

    return {
      window: summarizeWindow(timestamps, nowMs),
      monthUsed,
    };
  } catch {
    return sawAny
      ? { window: summarizeWindow(timestamps, nowMs), monthUsed }
      : null;
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
  // Agrupa por segundo — envios no mesmo segundo liberam juntos.
  const oldestSec = Math.floor(oldest / 1000);
  const nextReleaseCount = timestamps.filter(
    (t) => Math.floor(t / 1000) === oldestSec
  ).length;

  // Se já passou, não exibir horário antigo (o snapshot seguinte recalcula).
  if (nextReleaseMs <= nowMs) {
    return { used: timestamps.length, nextReleaseAt: null, nextReleaseCount: null };
  }

  return {
    used: timestamps.length,
    nextReleaseAt: new Date(nextReleaseMs).toISOString(),
    nextReleaseCount,
  };
}

async function persistResendQuota(quota: ResendQuota): Promise<void> {
  if (
    quota.emailsWindowUsed == null &&
    quota.emailsToday == null &&
    quota.emailsMonth == null &&
    quota.emailsQuotaHeaderMonth == null
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
        emailsQuotaHeaderMonth: quota.emailsQuotaHeaderMonth,
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

    const listed = await analyzeListedEmailUsage(apiKey);
    // Mês civil UTC via created_at; header só como referência / fallback.
    const monthFromList = listed != null ? listed.monthUsed : null;
    const emailsMonth = monthFromList != null ? monthFromList : headerMonth;

    let quota = applyWindowFields(
      {
        ...empty,
        emailsMonth,
        emailsQuotaHeaderMonth: headerMonth,
      },
      listed?.window ?? null
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

  // Após envio, recalcula janela 24h + mês civil UTC (não confiar só nos headers).
  void (async () => {
    try {
      const headerMonth = parseQuotaHeader(res, 'x-resend-monthly-quota');
      const listed = await analyzeListedEmailUsage(apiKey);
      const monthFromList = listed != null ? listed.monthUsed : null;
      const emailsMonth = monthFromList != null ? monthFromList : headerMonth;
      const quota = applyWindowFields(
        {
          ...emptyQuota(),
          emailsMonth,
          emailsQuotaHeaderMonth: headerMonth,
        },
        listed?.window ?? null
      );
      if (quota.emailsWindowUsed == null && emailsMonth == null) {
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
    const nextAt = Date.parse(String(data.emailsNextReleaseAt || ''));
    // Snapshot antigo com liberação já vencida: não bloquear; deixa o envio
    // (e o persist pós-envio) atualizar a cota.
    if (Number.isFinite(nextAt) && nextAt <= Date.now()) return false;

    const remaining = data.emailsWindowRemaining;
    if (typeof remaining === 'number' && remaining <= 0) return true;
    const used = Number(data.emailsWindowUsed ?? data.emailsToday);
    if (Number.isFinite(used) && used >= RESEND_FREE.emailsWindow) return true;
  } catch {
    /* ignore — tenta enviar mesmo assim */
  }
  return false;
}
