import { LegalPage } from '../../components/public/LegalPage';
import { SiteContentSections } from '../../components/public/SiteContentSections';
import { ProcessingOverlay } from '../../components/ui/ProcessingOverlay';
import { ROUTES } from '../../config';
import { useSiteContent } from '../../hooks/useSiteContent';
import { renderRichText } from '../../lib/siteContent';

export default function Privacy() {
  const { content, loading } = useSiteContent();
  const privacy = content.privacy;

  if (loading) {
    return (
      <div className="min-h-[50vh]">
        <ProcessingOverlay
          open
          label="Carregando"
          detail="Abrindo a Política de Privacidade..."
        />
      </div>
    );
  }

  return (
    <LegalPage title={privacy.title} subtitle={privacy.subtitle}>
      <p>{renderRichText(privacy.intro)}</p>
      <SiteContentSections
        sections={privacy.sections}
        termsLinkInSection={ROUTES.PUBLIC.TERMS}
      />
    </LegalPage>
  );
}
