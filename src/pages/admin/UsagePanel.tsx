import { useEffect, useState, type ReactNode } from 'react';
import { Activity, Gauge, Mail, RefreshCw, Users } from 'lucide-react';
import { PageHeader } from '../../components/admin/PageHeader';
import { Button, PageLoader, Alert } from '../../components/ui';
import { cn } from '../../lib/utils';
import {
  refreshUsageSnapshot,
  subscribeUsageLive,
} from '../../services/firebase/usageStats';
import type { UsageLevel, UsageLive } from '../../types/models/usage';

function tone(level: UsageLevel | undefined) {
  if (level === 'hot') {
    return {
      box: 'border-red-200 bg-red-50',
      text: 'text-red-800',
      bar: 'bg-red-500',
      label: 'Perto de cobrar extra',
    };
  }
  if (level === 'watch') {
    return {
      box: 'border-amber-200 bg-amber-50',
      text: 'text-amber-900',
      bar: 'bg-amber-500',
      label: 'Atenção',
    };
  }
  return {
    box: 'border-emerald-200 bg-emerald-50',
    text: 'text-emerald-900',
    bar: 'bg-emerald-600',
    label: 'Tranquilo',
  };
}

function barTone(pct: number) {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-emerald-600';
}

function formatWhen(iso?: string) {
  if (!iso) return 'Ainda sem atualização';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR');
}

function Bar({ pct, color }: { pct: number; color: string }) {
  const width = Math.max(2, Math.min(100, pct));
  return (
    <div className="h-2.5 rounded-full bg-white/70 overflow-hidden">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${width}%` }} />
    </div>
  );
}

export default function UsagePanel() {
  const [live, setLive] = useState<UsageLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeUsageLive((data) => {
      setLive(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const refresh = async () => {
    setBusy(true);
    setError(null);
    try {
      await refreshUsageSnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar.');
    } finally {
      setBusy(false);
    }
  };

  // Quando a próxima liberação vence, o Firestore fica desatualizado até o ciclo
  // de 5 min — dispara um refresh automático (e no horário marcado).
  useEffect(() => {
    const iso = live?.emailsNextReleaseAt;
    if (!iso || busy) return;
    const at = Date.parse(iso);
    if (!Number.isFinite(at)) return;
    const delay = Math.max(0, at - Date.now()) + 2_000;
    const timer = window.setTimeout(() => {
      void refreshUsageSnapshot().catch(() => {
        /* o botão Atualizar agora continua disponível */
      });
    }, Math.min(delay, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [live?.emailsNextReleaseAt, busy]);

  if (loading) return <PageLoader label="Abrindo o painel de uso..." />;

  const t = tone(live?.overall);
  const sessions = Math.max(0, Number(live?.siteSessionsToday) || 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Painel"
        actions={
          <Button
            type="button"
            variant="secondary"
            className="rounded-2xl"
            onClick={() => void refresh()}
            disabled={busy}
          >
            <RefreshCw size={16} className={cn(busy && 'animate-spin')} />
            Atualizar agora
          </Button>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <section className={cn('rounded-2xl border p-5 space-y-2', t.box)}>
        <p className={cn('text-xs font-black uppercase tracking-wider', t.text)}>
          {t.label}
        </p>
        <p className="text-lg font-black text-gray-900 leading-snug">
          {live?.headline ||
            'Ainda não há amostra de hoje. Abra o site público uma vez e aguarde até 5 minutos, ou clique em Atualizar agora.'}
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          {live?.details ||
            'O dia da cota do Firebase começa à meia-noite no horário do Pacífico (algumas horas a mais que Brasília).'}
        </p>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        <article className="rounded-2xl border border-gray-100 bg-white p-5 space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Users size={14} /> Visitas no site hoje
          </p>
          <p className="text-3xl font-black text-gray-900">
            {sessions.toLocaleString('pt-BR')}
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Cada pessoa que abre o site (uma vez por sessão no navegador). Não
            conta cada clique interno.
          </p>
          {live?.lastVisitAt ? (
            <p className="text-xs text-gray-400">
              Última visita: {formatWhen(live.lastVisitAt)}
            </p>
          ) : null}
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Activity size={14} /> Funções no servidor
          </p>
          <p className="text-3xl font-black text-gray-900">
            {live?.functionsExecToday != null
              ? Math.round(live.functionsExecToday).toLocaleString('pt-BR')
              : '—'}
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Quantas vezes os serviços (pagamento, e-mail, etc.) rodaram hoje,
            quando o Google informa esse número.
          </p>
        </article>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-1">
            <Gauge size={14} /> Banco de dados (faixa gratuita do dia)
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            No plano Blaze vocês só pagam o que passar desta faixa. Abaixo de
            50% está folgado; acima de 80% os administradores recebem um
            e-mail (no máximo um por dia).
          </p>
        </div>

        <Meter
          title="Leituras"
          hint="Cada vez que o site ou o painel busca um documento."
          used={live?.firestoreReadsToday}
          cap={50_000}
          pct={live?.readsPct ?? 0}
          color={barTone(live?.readsPct ?? 0)}
        />
        <Meter
          title="Escritas"
          hint="Salvar evento, pedido, check-in, visita…"
          used={live?.firestoreWritesToday}
          cap={20_000}
          pct={live?.writesPct ?? 0}
          color={barTone(live?.writesPct ?? 0)}
        />
        <Meter
          title="Exclusões"
          hint="Apagar ou arquivar dados."
          used={live?.firestoreDeletesToday}
          cap={20_000}
          pct={live?.deletesPct ?? 0}
          color={barTone(live?.deletesPct ?? 0)}
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-1">
            <Mail size={14} /> E-mails (faixa gratuita do Resend)
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            No plano gratuito: até 100 envios na janela móvel de 24 horas e
            3.000 por mês. A cota de 100 <strong>não</strong> zera à
            meia-noite — cada e-mail libera a vaga cerca de 24h após o envio.
            Ingressos, doações e avisos do painel entram nessa conta.
          </p>
        </div>
        <Meter
          title="E-mails nas últimas 24h"
          hint="Janela móvel do plano gratuito (100). Cada envio libera a vaga ~24h depois."
          used={live?.emailsWindowUsed ?? live?.emailsToday}
          cap={100}
          pct={live?.emailsDayPct ?? 0}
          color={barTone(live?.emailsDayPct ?? 0)}
          footer={
            <>
              {live?.emailsWindowRemaining != null ||
              live?.emailsWindowUsed != null ||
              live?.emailsToday != null ? (
                <p className="text-xs text-gray-600 font-semibold">
                  Restantes agora:{' '}
                  {(
                    live?.emailsWindowRemaining ??
                    Math.max(
                      0,
                      100 -
                        Math.round(
                          Number(live?.emailsWindowUsed ?? live?.emailsToday) ||
                            0
                        )
                    )
                  ).toLocaleString('pt-BR')}{' '}
                  de 100
                </p>
              ) : null}
              {live?.emailsNextReleaseAt ? (
                <p className="text-xs text-gray-500">
                  {Date.parse(live.emailsNextReleaseAt) <= Date.now() ? (
                    <>
                      Liberação prevista em{' '}
                      {formatWhen(live.emailsNextReleaseAt)} — atualizando a
                      contagem…
                    </>
                  ) : (
                    <>
                      Próxima liberação: {formatWhen(live.emailsNextReleaseAt)}
                      {live.emailsNextReleaseCount != null
                        ? ` (${live.emailsNextReleaseCount.toLocaleString('pt-BR')} ${
                            live.emailsNextReleaseCount === 1
                              ? 'envio'
                              : 'envios'
                          })`
                        : ''}
                    </>
                  )}
                </p>
              ) : null}
              {live?.emailsUpdatedAt ? (
                <p className="text-xs text-gray-400">
                  Cota de e-mail sincronizada: {formatWhen(live.emailsUpdatedAt)}
                </p>
              ) : null}
            </>
          }
        />
        <Meter
          title="E-mails no mês"
          hint="Limite mensal do plano gratuito (3.000)."
          used={live?.emailsMonth}
          cap={3_000}
          pct={live?.emailsMonthPct ?? 0}
          color={barTone(live?.emailsMonthPct ?? 0)}
        />
      </section>

      <p className="text-xs text-gray-400 leading-relaxed">
        Última sincronização: {formatWhen(live?.updatedAt)}. A visita no site
        aparece quase na hora; as barras oficiais do Firebase entram no ciclo
        de 5 minutos. {live?.monitoringNote}
      </p>
    </div>
  );
}

function Meter({
  title,
  hint,
  used,
  cap,
  pct,
  color,
  footer,
}: {
  title: string;
  hint: string;
  used?: number | null;
  cap: number;
  pct: number;
  color: string;
  footer?: ReactNode;
}) {
  const has = used != null;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-bold text-gray-800">{title}</span>
        <span className="text-gray-500 font-semibold tabular-nums">
          {has
            ? `${Math.round(used).toLocaleString('pt-BR')} / ${cap.toLocaleString('pt-BR')} (${pct}%)`
            : 'Aguardando métrica oficial'}
        </span>
      </div>
      <Bar pct={has ? pct : 0} color={color} />
      <p className="text-xs text-gray-400">{hint}</p>
      {footer}
    </div>
  );
}
