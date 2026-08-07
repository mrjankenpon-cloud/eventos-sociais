import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { healthService, type HealthReport, type HealthStatus } from '../../services/firebase/health';
import { PageHeader } from '../../components/admin/PageHeader';
import { Button, PageLoader } from '../../components/ui';
import { cn } from '../../lib/utils';

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'ok') return <CheckCircle2 className="text-emerald-600" size={18} />;
  if (status === 'warn') return <AlertTriangle className="text-amber-500" size={18} />;
  return <XCircle className="text-red-500" size={18} />;
}

export default function Health() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthService.runHealthCheck();
      setReport(data);
    } catch (err) {
      console.error('[Health]', err);
      setError(err instanceof Error ? err.message : 'Falha no health check');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  if (loading && !report) {
    return <PageLoader label="Verificando Firebase..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Check"
        subtitle="Diagnóstico interno de conectividade Firebase (página oculta)."
        actions={
          <Button type="button" variant="secondary" onClick={() => void run()} disabled={loading}>
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
            Reexecutar
          </Button>
        }
      />

      {error && (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}

      {report && (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Activity size={14} /> Projeto
            </p>
            <p className="text-lg font-black text-gray-900">{report.projectId}</p>
            <p className="text-xs text-gray-400">
              Verificado em {new Date(report.checkedAt).toLocaleString('pt-BR')}
            </p>
          </div>

          <ul className="space-y-3">
            {report.items.map((item) => (
              <li
                key={item.name}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4"
              >
                <StatusIcon status={item.status} />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500 break-words">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Collections
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {report.collections.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-gray-800">{c.name}</span>
                  <span
                    className={cn(
                      'text-xs font-bold uppercase',
                      c.exists ? 'text-emerald-600' : 'text-red-500'
                    )}
                  >
                    {c.exists ? `ok · ${c.sampleCount}` : 'falha'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
