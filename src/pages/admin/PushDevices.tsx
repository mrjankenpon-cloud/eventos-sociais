import { useCallback, useEffect, useState } from 'react';
import { Bell, RefreshCw, Smartphone } from 'lucide-react';
import { pushTokensService, type PushDevice } from '../../services/firebase/pushTokens';
import { PageHeader } from '../../components/admin/PageHeader';
import { Alert, Button, EmptyState, PageLoader } from '../../components/ui';

function formatWhen(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

export default function PushDevices() {
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDevices(await pushTokensService.listDevices());
    } catch {
      setError('Não foi possível carregar os aparelhos inscritos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader label="Carregando aparelhos inscritos..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avisos no app"
        subtitle="Celulares e computadores que ativaram as notificações do App Delphos."
        actions={
          <Button variant="secondary" className="rounded-2xl" onClick={() => void load()}>
            <RefreshCw size={16} className="mr-2" aria-hidden="true" />
            Atualizar
          </Button>
        }
      />

      {error ? (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <p className="text-sm text-gray-500">
        {devices.length === 1
          ? '1 aparelho inscrito.'
          : `${devices.length} aparelhos inscritos.`}{' '}
        Não aparece nome nem telefone: a inscrição é do dispositivo, sem login.
      </p>

      {devices.length === 0 ? (
        <div className="rounded-3xl bg-white border border-gray-100">
          <EmptyState
            icon={Bell}
            title="Nenhum aparelho inscrito"
            description="Quando alguém instalar o App Delphos e permitir avisos, o aparelho entra nesta lista."
          />
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {devices.map((item, index) => (
              <li
                key={item.id}
                className="flex items-start gap-3 px-4 sm:px-5 py-4"
              >
                <span className="w-10 h-10 shrink-0 rounded-2xl bg-brand-muted text-brand flex items-center justify-center">
                  <Smartphone size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-gray-900">
                    {item.device}
                    <span className="font-bold text-gray-400"> · {item.browser}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Última atividade {formatWhen(item.updatedAt)}
                    {item.createdAt
                      ? ` · inscrito em ${formatWhen(item.createdAt)}`
                      : ''}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Aparelho {index + 1}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
