import { LegalPage } from '../../components/public/LegalPage';
import { SiteContentSections } from '../../components/public/SiteContentSections';
import { ProcessingOverlay } from '../../components/ui/ProcessingOverlay';
import { ROUTES } from '../../config';
import { useSiteContent } from '../../hooks/useSiteContent';
import { renderRichText } from '../../lib/siteContent';

export default function Terms() {
  const { content, loading } = useSiteContent();
  const terms = content.terms;

  if (loading) {
    return (
      <div className="min-h-[50vh]">
        <ProcessingOverlay open label="Carregando" detail="Abrindo o Termo de Uso..." />
      </div>
    );
  }

  return (
    <LegalPage title={terms.title} subtitle={terms.subtitle}>
      <p>{renderRichText(terms.intro)}</p>
      <SiteContentSections
        sections={terms.sections}
        privacyLinkInSection={ROUTES.PUBLIC.PRIVACY}
      />
    </LegalPage>
  );
}
