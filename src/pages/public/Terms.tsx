import { LegalPage } from '../../components/public/LegalPage';
import { RichContent } from '../../components/public/RichContent';
import { ProcessingOverlay } from '../../components/ui/ProcessingOverlay';
import { useSiteContent } from '../../hooks/useSiteContent';

export default function Terms() {
  const { content, loading } = useSiteContent();

  if (loading) {
    return (
      <div className="min-h-[50vh]">
        <ProcessingOverlay open label="Carregando" detail="Abrindo o Termo de Uso..." />
      </div>
    );
  }

  return (
    <LegalPage>
      <RichContent html={content.terms.html} />
    </LegalPage>
  );
}
