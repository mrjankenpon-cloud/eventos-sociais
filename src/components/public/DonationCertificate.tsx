import { ORG, amountInWordsPt, formatCpfCnpj, orgAddressLine } from '../../lib/orgInfo';
import { formatCurrency } from '../../lib/utils';

export type DonationCertificateData = {
  numero: string;
  doadorNome: string;
  documento: string;
  documentoTipo?: 'cpf' | 'cnpj';
  email?: string;
  valor: number;
  dataIso: string;
  mensagem?: string;
};

function formatDatePt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function DonationCertificate({ data }: { data: DonationCertificateData }) {
  const docLabel = data.documentoTipo === 'cnpj' ? 'CNPJ' : 'CPF';

  return (
    <article className="donation-certificate bg-white border border-gray-200 rounded-3xl overflow-hidden print:border-0 print:rounded-none">
      <header className="bg-gradient-to-r from-brand from-0% via-brand via-[28%] via-brand-dark via-[50%] via-brand-deeper via-[75%] to-[#050505] px-5 sm:px-8 py-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-white/80 text-[10px] font-medium tracking-[0.12em] uppercase">
            Instituto
          </p>
          <p className="text-white font-bold tracking-[0.22em] uppercase text-lg leading-tight">
            DELPHOS
          </p>
        </div>
        <img
          src="/delphos-logo.png"
          alt=""
          className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
        />
      </header>

      <div className="p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand">
            Recibo e certificado de doação
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Obrigado por esta boa ação
          </h2>
          <p className="text-xs text-gray-500 font-mono">{data.numero}</p>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed text-center">
          A {ORG.razaoSocial} reconhece e agradece a doação abaixo. Gestos
          como o seu sustentam encontros, solidariedade e o trabalho junto às
          instituições parceiras. Boas ações são sempre bem-vindas.
        </p>

        <dl className="rounded-2xl bg-brand-muted/40 border border-brand/10 p-4 sm:p-5 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Doador</dt>
            <dd className="font-bold text-gray-900 text-right">{data.doadorNome}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">{docLabel}</dt>
            <dd className="font-bold text-gray-900 tabular-nums">
              {formatCpfCnpj(data.documento)}
            </dd>
          </div>
          {data.email ? (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">E-mail</dt>
              <dd className="font-bold text-gray-900 text-right break-all">
                {data.email}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Data</dt>
            <dd className="font-bold text-gray-900">{formatDatePt(data.dataIso)}</dd>
          </div>
          <div className="flex justify-between gap-4 pt-2 border-t border-brand/10">
            <dt className="text-gray-500">Valor</dt>
            <dd className="font-black text-brand text-lg tabular-nums">
              {formatCurrency(data.valor)}
            </dd>
          </div>
          <p className="text-xs text-gray-500 italic pt-1">
            ({amountInWordsPt(data.valor)})
          </p>
        </dl>

        {data.mensagem?.trim() ? (
          <blockquote className="text-sm text-gray-600 italic border-l-4 border-brand/30 pl-4">
            “{data.mensagem.trim()}”
          </blockquote>
        ) : null}

        <div className="text-xs text-gray-500 space-y-1 leading-relaxed">
          <p className="font-bold text-gray-700">Entidade beneficiária</p>
          <p>
            {ORG.razaoSocial} · CNPJ {ORG.cnpj}
            <br />
            {orgAddressLine()}
          </p>
          <p className="pt-2">
            Este documento comprova a doação voluntária recebida. Não constitui
            nota fiscal nem garantia de dedução no Imposto de Renda. Consulte
            a página de doações e um profissional de sua confiança.
          </p>
        </div>
      </div>
    </article>
  );
}
