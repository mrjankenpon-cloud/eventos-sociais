import { LegalPage } from '../../components/public/LegalPage';
import { RichContent } from '../../components/public/RichContent';
import { useSiteContent } from '../../hooks/useSiteContent';
import { stripLeadingH1 } from '../../lib/siteContent';

export default function Privacy() {
  const { content } = useSiteContent();

  return (
    <LegalPage title="Privacidade">
      <RichContent html={stripLeadingH1(content.privacy.html)} />
    </LegalPage>
  );
}
