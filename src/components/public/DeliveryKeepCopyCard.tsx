import { Download, Printer, Share2, Smartphone } from 'lucide-react';
import { Button } from '../ui';

type DeliveryKeepCopyCardProps = {
  kind: 'ingresso' | 'certificado';
  /** E-mail pode demorar por volume/cota — tom informativo, não de erro. */
  emailMayDelay?: boolean;
  onSavePdf: () => void;
  onShare?: () => void;
  canShare?: boolean;
};

/**
 * Orientação elegante após emitir ingresso/certificado:
 * guardar no aparelho (PDF), imprimir ou compartilhar — sem parecer falha.
 */
export function DeliveryKeepCopyCard({
  kind,
  emailMayDelay = false,
  onSavePdf,
  onShare,
  canShare = false,
}: DeliveryKeepCopyCardProps) {
  const noun = kind === 'certificado' ? 'certificado' : 'ingresso';
  const nounPlural =
    kind === 'certificado' ? 'o certificado' : 'seus ingressos';

  return (
    <aside
      className="rounded-2xl border border-brand/15 bg-gradient-to-br from-brand-muted/80 to-white p-4 sm:p-5 space-y-3 print:hidden"
      aria-label="Como guardar seu documento"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-brand/10 text-brand p-2 shrink-0">
          <Smartphone size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-black text-gray-900 leading-snug">
            Guarde {nounPlural} no seu aparelho
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Além do e-mail, salve o PDF neste celular ou computador — assim você
            imprime, compartilha ou mostra na porta sem depender da caixa de
            entrada.
          </p>
          {emailMayDelay ? (
            <p className="text-sm text-brand-dark/90 leading-relaxed">
              Neste momento há muitos acessos: o e-mail com o {noun} pode
              demorar um pouco para chegar. Enquanto isso, use o botão abaixo
              para salvar já no dispositivo.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          type="button"
          className="flex-1 rounded-2xl"
          onClick={onSavePdf}
        >
          <Download size={16} aria-hidden="true" />
          Salvar PDF / Imprimir
        </Button>
        {canShare && onShare ? (
          <Button
            type="button"
            variant="secondary"
            className="flex-1 rounded-2xl"
            onClick={onShare}
          >
            <Share2 size={16} aria-hidden="true" />
            Compartilhar
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="flex-1 rounded-2xl"
            onClick={onSavePdf}
          >
            <Printer size={16} aria-hidden="true" />
            Imprimir
          </Button>
        )}
      </div>
    </aside>
  );
}
