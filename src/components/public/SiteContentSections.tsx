import { Link } from 'react-router-dom';
import { LegalSection } from './LegalPage';
import { renderRichText } from '../../lib/siteContent';
import type { SiteContentSection } from '../../types/models/siteContent';

/** Renderiza seções salvas pelo admin (parágrafos + bullets). */
export function SiteContentSections({
  sections,
  privacyLinkInSection,
  termsLinkInSection,
}: {
  sections: SiteContentSection[];
  /** Se o título contém "Privacidade", injeta link interno na 1ª menção. */
  privacyLinkInSection?: string;
  termsLinkInSection?: string;
}) {
  return (
    <>
      {sections.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {section.bullets.map((item, idx) => (
                <li key={idx}>{renderRichText(item)}</li>
              ))}
            </ul>
          ) : null}
          {section.paragraphs.map((paragraph, idx) => (
            <p key={idx}>
              {privacyLinkInSection &&
              section.title.toLowerCase().includes('privacidade') &&
              idx === 0 ? (
                <PrivacyLinkedText text={paragraph} to={privacyLinkInSection} />
              ) : termsLinkInSection &&
                section.title.toLowerCase().includes('crianças') &&
                idx === 0 ? (
                <TermsLinkedText text={paragraph} to={termsLinkInSection} />
              ) : (
                renderRichText(paragraph)
              )}
            </p>
          ))}
        </LegalSection>
      ))}
    </>
  );
}

function PrivacyLinkedText({ text, to }: { text: string; to: string }) {
  const marker = 'Política de Privacidade';
  const i = text.indexOf(marker);
  if (i < 0) return <>{renderRichText(text)}</>;
  return (
    <>
      {renderRichText(text.slice(0, i))}
      <Link to={to} className="font-bold text-brand underline">
        {marker}
      </Link>
      {renderRichText(text.slice(i + marker.length))}
    </>
  );
}

function TermsLinkedText({ text, to }: { text: string; to: string }) {
  const marker = 'Termo de Uso';
  const i = text.indexOf(marker);
  if (i < 0) return <>{renderRichText(text)}</>;
  return (
    <>
      {renderRichText(text.slice(0, i))}
      <Link to={to} className="font-bold text-brand underline">
        {marker}
      </Link>
      {renderRichText(text.slice(i + marker.length))}
    </>
  );
}
