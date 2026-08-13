import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Hash, Mail, MapPin, Phone } from 'lucide-react';
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
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <OrgFact
            icon={<Building2 size={18} aria-hidden="true" />}
            label="Razão social"
            value={ORG.razaoSocial}
            wide
          />
          <OrgFact
            icon={<Hash size={18} aria-hidden="true" />}
            label="CNPJ"
            value={ORG.cnpj}
          />
          <OrgFact
            icon={<MapPin size={18} aria-hidden="true" />}
            label="Endereço"
            value={orgAddressLine()}
            wide
          />
          <OrgFact
            icon={<Phone size={18} aria-hidden="true" />}
            label="Telefone"
            value={ORG.telefone}
            href={`tel:${ORG.telefone.replace(/\D/g, '')}`}
          />
          <OrgFact
            icon={<Mail size={18} aria-hidden="true" />}
            label="E-mail"
            value={ORG.emailOperacional}
            href={`mailto:${ORG.emailOperacional}`}
          />
        </ul>
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

function OrgFact({
  icon,
  label,
  value,
  href,
  wide,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  wide?: boolean;
}) {
  const body = (
    <>
      <span className="shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-muted text-brand">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
          {label}
        </span>
        <span className="mt-1 block text-sm sm:text-[15px] font-bold text-gray-900 leading-snug break-words">
          {value}
        </span>
      </span>
    </>
  );

  const className = `flex items-start gap-3.5 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 ${
    wide ? 'sm:col-span-2' : ''
  }`;

  return (
    <li className={className}>
      {href ? (
        <a
          href={href}
          className="flex items-start gap-3.5 min-w-0 w-full rounded-xl focus-visible:outline-none hover:opacity-90"
        >
          {body}
        </a>
      ) : (
        body
      )}
    </li>
  );
}
