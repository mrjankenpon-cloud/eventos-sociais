import * as functions from 'firebase-functions/v1';
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  FREE_DAILY,
  RESEND_FREE,
  levelFromPct,
  liveRef,
  pctOf,
  quotaDayId,
  startOfQuotaDayIso,
  worstLevel,
  type UsageLevel,
} from './quota';
import { notifyAdminsIfCriticalUsage } from './notifyCriticalUsage';
import { fetchResendUsage } from '../email/resend';

async function googleAccessToken(): Promise<string | null> {
  try {
    const mod = require('google-auth-library') as {
      GoogleAuth: new (opts: { scopes: string[] }) => {
        getClient: () => Promise<{ getAccessToken: () => Promise<{ token?: string | null }> }>;
      };
    };
    const auth = new mod.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/monitoring.read'],
    });
    const client = await auth.getClient();
    const got = await client.getAccessToken();
    return got.token || null;
  } catch (error) {
    functions.logger.warn('[usage] auth monitoring', error);
    return null;
  }
}

function projectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT_ID ||
    'eventosociais-c057d'
  );
}

function sumPoints(series: Array<{ points?: Array<{ value?: { doubleValue?: number; int64Value?: string } }> }>): number {
  let total = 0;
  for (const s of series) {
    for (const p of s.points || []) {
      const v = p.value || {};
      if (typeof v.doubleValue === 'number') total += v.doubleValue;
      else if (v.int64Value) total += Number(v.int64Value) || 0;
    }
  }
  return total;
}

async function queryMetric(
  token: string,
  metricType: string
): Promise<number | null> {
  const pid = projectId();
  const end = new Date();
  const start = startOfQuotaDayIso(end);
  const filter = encodeURIComponent(`metric.type="${metricType}"`);
  const url =
    `https://monitoring.googleapis.com/v3/projects/${pid}/timeSeries` +
    `?filter=${filter}` +
    `&interval.startTime=${encodeURIComponent(start)}` +
    `&interval.endTime=${encodeURIComponent(end.toISOString())}` +
    `&aggregation.alignmentPeriod=3600s` +
    `&aggregation.perSeriesAligner=ALIGN_DELTA` +
    `&aggregation.crossSeriesReducer=REDUCE_SUM`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`monitoring ${res.status} ${metricType} ${body.slice(0, 180)}`);
  }
  const json = (await res.json()) as {
    timeSeries?: Array<{
      points?: Array<{ value?: { doubleValue?: number; int64Value?: string } }>;
    }>;
  };
  return sumPoints(json.timeSeries || []);
}

const READ_METRICS = [
  'firestore.googleapis.com/document/read_count',
  'firestore.googleapis.com/document/read_ops_count',
];
const WRITE_METRICS = [
  'firestore.googleapis.com/document/write_count',
  'firestore.googleapis.com/document/write_ops_count',
];
const DELETE_METRICS = [
  'firestore.googleapis.com/document/delete_count',
  'firestore.googleapis.com/document/delete_ops_count',
];
const FN_METRICS = ['cloudfunctions.googleapis.com/function/execution_count'];

async function firstWorking(
  token: string,
  names: string[]
): Promise<{ value: number | null; used: string; error?: string }> {
  let lastErr = '';
  for (const name of names) {
    try {
      const value = await queryMetric(token, name);
      return { value, used: name };
    } catch (error) {
      lastErr = error instanceof Error ? error.message : String(error);
    }
  }
  return { value: null, used: names[0], error: lastErr };
}

function headlineFor(level: UsageLevel, hasOfficial: boolean): string {
  if (!hasOfficial) {
    if (level === 'hot') {
      return 'Muitos acessos hoje — acompanhe o Console Firebase se a conta começar a cobrar extra.';
    }
    if (level === 'watch') {
      return 'Movimento moderado no site. Ainda não dá para cravar o limite oficial sem a métrica do Google.';
    }
    return 'Acessos tranquilos por enquanto (contagem do site).';
  }
  if (level === 'hot') {
    return 'Atenção: o uso de hoje já está perto (ou acima) da faixa gratuita diária. Extra no Blaze começa a ser cobrado.';
  }
  if (level === 'watch') {
    return 'Uso na metade da faixa gratuita do dia. Ainda está ok, mas vale olhar se houver pico de evento.';
  }
  return 'Tudo tranquilo: o banco ainda está confortável na faixa gratuita de hoje.';
}

export async function collectUsageSnapshot(): Promise<void> {
  const day = quotaDayId();
  const ref = liveRef();
  const snap = await ref.get();
  const prev = snap.data() || {};
  const sessions =
    String(prev.quotaDay || '') === day
      ? Number(prev.siteSessionsToday) || 0
      : 0;

  let reads: number | null = null;
  let writes: number | null = null;
  let deletes: number | null = null;
  let functionsExec: number | null = null;
  let monitoringOk = false;
  let monitoringNote =
    'Métricas oficiais ainda não lidas. O painel usa as visitas do site até o Google Monitoring responder.';

  const token = await googleAccessToken();
  if (token) {
    try {
      const [r, w, d, f] = await Promise.all([
        firstWorking(token, READ_METRICS),
        firstWorking(token, WRITE_METRICS),
        firstWorking(token, DELETE_METRICS),
        firstWorking(token, FN_METRICS),
      ]);
      reads = r.value;
      writes = w.value;
      deletes = d.value;
      functionsExec = f.value;
      const any = [reads, writes, deletes].some((n) => n != null);
      monitoringOk = any;
      monitoringNote = any
        ? 'Números oficiais do Google Cloud Monitoring (desde 0h no fuso do Pacífico, que é o dia da cota).'
        : r.error ||
          w.error ||
          'Sem série de métricas. Conceda à conta das Functions a função Monitoring Viewer (roles/monitoring.viewer).';
    } catch (error) {
      monitoringNote =
        error instanceof Error
          ? error.message.slice(0, 220)
          : 'Falha ao consultar o Monitoring.';
    }
  } else {
    monitoringNote =
      'Não foi possível autenticar no Monitoring. Visitas do site continuam sendo contadas.';
  }

  const readsPct = pctOf(reads, FREE_DAILY.reads);
  const writesPct = pctOf(writes, FREE_DAILY.writes);
  const deletesPct = pctOf(deletes, FREE_DAILY.deletes);

  const resend = await fetchResendUsage();
  const emailsToday = resend.emailsToday;
  const emailsMonth =
    resend.emailsMonth != null
      ? resend.emailsMonth
      : Number.isFinite(Number(prev.emailsMonth))
        ? Number(prev.emailsMonth)
        : null;
  const emailsDayPct = pctOf(emailsToday, RESEND_FREE.emailsDay);
  const emailsMonthPct = pctOf(emailsMonth, RESEND_FREE.emailsMonth);
  const emailsKnown = emailsToday != null || emailsMonth != null;

  let overall: UsageLevel = 'ok';
  if (monitoringOk) {
    overall = worstLevel(
      levelFromPct(readsPct),
      worstLevel(levelFromPct(writesPct), levelFromPct(deletesPct))
    );
  } else {
    const estReads = sessions * 40;
    overall = levelFromPct(pctOf(estReads, FREE_DAILY.reads));
  }
  if (emailsKnown) {
    overall = worstLevel(
      overall,
      worstLevel(levelFromPct(emailsDayPct), levelFromPct(emailsMonthPct))
    );
  }

  const details = monitoringOk
    ? `Leituras ${Math.round(reads || 0).toLocaleString('pt-BR')} de ${FREE_DAILY.reads.toLocaleString('pt-BR')} (${readsPct}%). Escritas ${Math.round(writes || 0).toLocaleString('pt-BR')} de ${FREE_DAILY.writes.toLocaleString('pt-BR')} (${writesPct}%).`
    : `Hoje o site registrou ${sessions.toLocaleString('pt-BR')} sessões. Cada visita lê o banco várias vezes; isso é um sinal de movimento, não a fatura oficial.`;

  const alreadyAlertedDay = String(prev.criticalAlertDay || '');
  let criticalAlertDay = alreadyAlertedDay === day ? alreadyAlertedDay : '';
  let criticalAlertAt = String(prev.criticalAlertAt || '');

  try {
    const sent = await notifyAdminsIfCriticalUsage({
      quotaDay: day,
      alreadyAlertedDay,
      overall,
      monitoringOk,
      emailsKnown,
      reads,
      writes,
      deletes,
      readsPct,
      writesPct,
      deletesPct,
      emailsToday,
      emailsMonth,
      emailsDayPct,
      emailsMonthPct,
    });
    if (sent) {
      criticalAlertDay = day;
      criticalAlertAt = new Date().toISOString();
    }
  } catch (error) {
    functions.logger.warn('[usage] alerta crítico', error);
  }

  await ref.set(
    {
      quotaDay: day,
      siteSessionsToday: sessions,
      updatedAt: new Date().toISOString(),
      firestoreReadsToday: reads,
      firestoreWritesToday: writes,
      firestoreDeletesToday: deletes,
      functionsExecToday: functionsExec,
      readsPct,
      writesPct,
      deletesPct,
      monitoringOk,
      monitoringNote,
      overall,
      headline: headlineFor(overall, monitoringOk),
      details,
      emailsToday,
      emailsMonth,
      emailsDayPct,
      emailsMonthPct,
      ...(criticalAlertDay
        ? { criticalAlertDay, criticalAlertAt }
        : {}),
    },
    { merge: true }
  );
}

export const collectUsageSnapshotHttp = onRequest(
  { region: 'us-central1', cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    try {
      const header = String(req.headers.authorization || '');
      const match = header.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        res.status(401).json({ error: 'Autenticação obrigatória' });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(match[1]);
      const role = String(decoded.role || '');
      const MASTER = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';
      const allowed =
        decoded.uid === MASTER ||
        decoded.master === true ||
        ['admin', 'editor', 'operador', 'viewer'].includes(role);
      if (!allowed) {
        const userSnap = await admin
          .firestore()
          .collection('usuarios')
          .doc(decoded.uid)
          .get();
        const urole = String(userSnap.data()?.role || '');
        if (!['admin', 'editor', 'operador', 'viewer'].includes(urole)) {
          res.status(403).json({ error: 'Sem permissão' });
          return;
        }
      }
      await collectUsageSnapshot();
      res.json({ ok: true });
    } catch (error) {
      logger.error('[collectUsageSnapshotHttp]', error);
      res.status(500).json({ error: 'Falha ao atualizar o painel de uso' });
    }
  }
);
