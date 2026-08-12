import { useEffect, useState } from 'react';
import { Archive, Download, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export type ReportDisposition = 'keep' | 'export' | 'purge';

type ArchiveEventDialogProps = {
  isOpen: boolean;
  eventTitle: string;
  onClose: () => void;
  onConfirm: (disposition: ReportDisposition) => void;
  isLoading?: boolean;
};

const OPTIONS: Array<{
  id: ReportDisposition;
  title: string;
  description: string;
  icon: typeof Archive;
  danger?: boolean;
}> = [
  {
    id: 'keep',
    title: 'Manter relatório no sistema',
    description:
      'Arquiva o evento (sai do público). Pedidos, ingressos e o relatório continuam acessíveis no painel.',
    icon: Archive,
  },
  {
    id: 'export',
    title: 'Exportar relatório (CSV) e manter',
    description:
      'Baixa o CSV com resumo, participantes e pedidos; depois arquiva o evento mantendo os dados no sistema.',
    icon: Download,
  },
  {
    id: 'purge',
    title: 'Apagar relatório do banco de dados',
    description:
      'Remove permanentemente pedidos, ingressos emitidos, check-ins e o evento. Irreversível — use só se tiver certeza.',
    icon: Trash2,
    danger: true,
  },
];

/**
 * Diálogo de exclusão/arquivamento com escolha explícita sobre o relatório.
 */
export function ArchiveEventDialog({
  isOpen,
  eventTitle,
  onClose,
  onConfirm,
  isLoading,
}: ArchiveEventDialogProps) {
  const [disposition, setDisposition] = useState<ReportDisposition>('keep');
  const [purgeAck, setPurgeAck] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDisposition('keep');
    setPurgeAck(false);
  }, [isOpen]);

  const canConfirm =
    disposition !== 'purge' || purgeAck;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="O que fazer com o relatório?"
      maxWidth="lg"
    >
      <p className="text-sm text-gray-600 leading-relaxed mb-5">
        Você está removendo <span className="font-bold text-gray-900">{eventTitle}</span>.
        Escolha o destino dos dados de compra e do relatório antes de continuar.
      </p>

      <fieldset className="space-y-3 mb-6" disabled={isLoading}>
        <legend className="sr-only">Destino do relatório</legend>
        {OPTIONS.map((opt) => {
          const selected = disposition === opt.id;
          const Icon = opt.icon;
          return (
            <label
              key={opt.id}
              className={cn(
                'flex gap-3 p-4 rounded-2xl border cursor-pointer transition-colors',
                selected
                  ? opt.danger
                    ? 'border-red-300 bg-red-50/80'
                    : 'border-brand/40 bg-brand-muted/40'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              )}
            >
              <input
                type="radio"
                name="report-disposition"
                value={opt.id}
                checked={selected}
                onChange={() => setDisposition(opt.id)}
                className="mt-1 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                  <Icon
                    size={16}
                    className={opt.danger ? 'text-red-500' : 'text-brand'}
                    aria-hidden="true"
                  />
                  {opt.title}
                </span>
                <span className="block text-xs text-gray-500 mt-1 leading-relaxed">
                  {opt.description}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {disposition === 'purge' ? (
        <label className="flex items-start gap-2 mb-6 text-sm text-red-700">
          <input
            type="checkbox"
            checked={purgeAck}
            onChange={(e) => setPurgeAck(e.target.checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <span>
            Entendo que pedidos, ingressos e o relatório deste evento serão
            apagados permanentemente e não poderão ser recuperados.
          </span>
        </label>
      ) : null}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant={disposition === 'purge' ? 'danger' : 'primary'}
          onClick={() => onConfirm(disposition)}
          isLoading={isLoading}
          disabled={!canConfirm}
        >
          {disposition === 'keep'
            ? 'Arquivar e manter relatório'
            : disposition === 'export'
              ? 'Exportar e arquivar'
              : 'Apagar definitivamente'}
        </Button>
      </div>
    </Modal>
  );
}
