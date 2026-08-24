import { LegalPage } from '../../components/public/LegalPage';
import { RichContent } from '../../components/public/RichContent';
import { useSiteContent } from '../../hooks/useSiteContent';
import { stripLeadingH1 } from '../../lib/siteContent';

export default function Terms() {
  const { content } = useSiteContent();

  return (
    <LegalPage title="Termo de Uso">
      <RichContent html={stripLeadingH1(content.terms.html)} />
    </LegalPage>
  );
}
