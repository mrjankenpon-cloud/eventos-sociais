import { useEffect, useState } from 'react';
import { LegalPage } from '../../components/public/LegalPage';
import { RichContent } from '../../components/public/RichContent';
import { AppImage } from '../../components/ui/AppImage';
import { ProcessingOverlay } from '../../components/ui/ProcessingOverlay';
import { institutionService } from '../../services/institution.service';
import type { Institution } from '../../types';
import { useSiteContent } from '../../hooks/useSiteContent';

function institutionHref(inst: Institution): string | undefined {
  const site = inst.site?.trim();
  if (site) return site.startsWith('http') ? site : `https://${site}`;
  return undefined;
}

export default function About() {
  const { content, loading } = useSiteContent();
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

  if (loading) {
    return (
      <div className="min-h-[50vh]">
        <ProcessingOverlay open label="Carregando" detail="Abrindo a página Sobre..." />
      </div>
    );
  }

  return (
    <LegalPage>
      <RichContent html={content.about.html} />

      {partners.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-gray-900">
            Instituições parceiras
          </h2>
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
        </section>
      ) : null}
    </LegalPage>
  );
}
