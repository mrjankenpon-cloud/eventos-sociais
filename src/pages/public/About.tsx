import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LegalPage, LegalSection } from '../../components/public/LegalPage';
import { AppImage } from '../../components/ui/AppImage';
import { institutionService } from '../../services/institution.service';
import type { Institution } from '../../types';
import { ORG, orgAddressLine } from '../../lib/orgInfo';
import { ROUTES } from '../../config';

function institutionHref(inst: Institution): string | undefined {
  const site = inst.site?.trim();
  if (site) return site.startsWith('http') ? site : `https://${site}`;
  return undefined;
}

export default function About() {
  const [partners, setPartners] = useState<Institution[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await institutionService.getActive();
        if (!cancelled) setPartners(data);
      } catch {
        if (!cancelled) setPartners([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LegalPage
      title="Sobre"
      subtitle="Quem somos, o que fazemos e com quem caminhamos."
    >
      <LegalSection title="O Instituto Delphos">
        <p>
          O <strong className="text-gray-900">Instituto Delphos</strong> é a
          face pública da{' '}
          <strong className="text-gray-900">{ORG.razaoSocial}</strong>,
          organização religiosa com situação cadastral ativa, dedicada a
          iniciativas de convívio, cultura e solidariedade. Desde{' '}
          {ORG.dataAberturaLabel}, a entidade promove encontros e ações que
          aproximam pessoas, instituições e causas sociais.
        </p>
        <p>
          Este site reúne os eventos abertos ao público, a emissão de ingressos
          e o canal de doações. Cada inscrição e cada contribuição ajudam a
          manter a programação e o apoio às instituições parceiras cadastradas
          na área administrativa.
        </p>
      </LegalSection>

      <LegalSection title="O que fazemos">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Organizar e divulgar eventos institucionais e beneficentes, com
            venda de ingressos e controle de acesso.
          </li>
          <li>
            Dar visibilidade às instituições parceiras ativas, exatamente como
            cadastradas na aba Instituições da área administrativa.
          </li>
          <li>
            Receber doações voluntárias, com recibo/certificado para o doador.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Dados institucionais">
        <p>
          Informações extraídas do Comprovante de Inscrição e de Situação
          Cadastral da Receita Federal do Brasil.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-gray-50 border border-gray-100 p-4 sm:p-5">
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Razão social
            </dt>
            <dd className="font-bold text-gray-900 mt-1">{ORG.razaoSocial}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              CNPJ
            </dt>
            <dd className="font-bold text-gray-900 mt-1 tabular-nums">
              {ORG.cnpj}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Natureza jurídica
            </dt>
            <dd className="font-bold text-gray-900 mt-1">
              {ORG.naturezaJuridica}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Situação cadastral
            </dt>
            <dd className="font-bold text-gray-900 mt-1">
              {ORG.situacaoCadastral}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Abertura
            </dt>
            <dd className="font-bold text-gray-900 mt-1">
              {ORG.dataAberturaLabel}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Atividade principal
            </dt>
            <dd className="font-bold text-gray-900 mt-1">
              {ORG.atividadePrincipal}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Endereço
            </dt>
            <dd className="font-bold text-gray-900 mt-1">{orgAddressLine()}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Telefone
            </dt>
            <dd className="font-bold text-gray-900 mt-1">{ORG.telefone}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              E-mail operacional
            </dt>
            <dd className="font-bold text-gray-900 mt-1 break-all">
              {ORG.emailOperacional}
            </dd>
          </div>
        </dl>
      </LegalSection>

      {partners.length > 0 ? (
        <LegalSection title="Instituições parceiras">
          <p>
            Parceiros ativos no catálogo administrativo. A faixa da página
            inicial exibe o mesmo conjunto.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {partners.map((inst) => {
              const href = institutionHref(inst);
              const inner = (
                <>
                  <AppImage
                    src={inst.logo}
                    alt=""
                    className="h-12 w-12 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block font-black text-gray-900 text-sm leading-snug">
                      {inst.nome}
                    </span>
                    {inst.descricaoCurta ? (
                      <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {inst.descricaoCurta}
                      </span>
                    ) : null}
                  </span>
                </>
              );
              return (
                <li key={inst.id}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-brand/30 transition-colors"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </LegalSection>
      ) : null}

      <p className="text-sm">
        Quer apoiar o trabalho? Conheça a página de{' '}
        <Link
          to={ROUTES.PUBLIC.DONATIONS}
          className="font-bold text-brand underline"
        >
          doações
        </Link>
        .
      </p>
    </LegalPage>
  );
}
