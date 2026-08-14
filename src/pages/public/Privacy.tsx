import { LegalPage } from '../../components/public/LegalPage';
import { RichContent } from '../../components/public/RichContent';
import { ProcessingOverlay } from '../../components/ui/ProcessingOverlay';
import { useSiteContent } from '../../hooks/useSiteContent';

export default function Privacy() {
  const { content, loading } = useSiteContent();

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
    <LegalPage>
      <RichContent html={content.privacy.html} />
    </LegalPage>
  );
}
