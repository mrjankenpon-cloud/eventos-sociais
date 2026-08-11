import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ExternalLink,
  Globe,
  Instagram,
  Facebook,
  Mail,
  Phone,
  MapPin,
  Copy,
  Check,
} from 'lucide-react';
import type { Institution, Sponsor } from '../../types';
import { Button, Modal, AppImage } from '../ui';
import { THEME } from '../../theme';
import { cn } from '../../lib/utils';

interface EventPartnersSectionProps {
  institutions: Institution[];
  sponsors: Sponsor[];
  showInstitutions: boolean;
  showSponsors: boolean;
}

export function EventPartnersSection({
  institutions,
  sponsors,
  showInstitutions,
  showSponsors,
}: EventPartnersSectionProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

  const hasInstitutions = showInstitutions && institutions.length > 0;
  const hasSponsors = showSponsors && sponsors.length > 0;

  if (!hasInstitutions && !hasSponsors) return null;

  return (
    <>
      <section className="mt-4 sm:mt-5">
        <div
          className={cn(
            'grid gap-4 lg:gap-5 items-stretch',
            hasInstitutions && hasSponsors
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1'
          )}
        >
          {hasInstitutions && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
              className="card-surface p-4 sm:p-5 flex flex-col h-full"
            >
              <p className="label-micro text-brand mb-0.5">Impacto social</p>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-3">
                Instituições Beneficiadas
              </h2>
              <ul className="space-y-2.5 flex-1">
                {institutions.map((inst) => (
                  <li
                    key={inst.id}
                    className="flex items-start gap-3 p-2.5 sm:p-3 rounded-xl bg-gray-50/80 border border-gray-100"
                  >
                    <AppImage
                      src={inst.logo}
                      alt=""
                      className="w-11 h-11 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-gray-900 leading-snug text-sm sm:text-base">
                        {inst.nome}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {inst.descricaoCurta}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-2 rounded-xl h-8 text-xs"
                        onClick={() => setSelectedInstitution(inst)}
                      >
                        Conheça a Instituição
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {hasSponsors && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: THEME.motion.duration,
                ease: THEME.motion.ease,
                delay: 0.05,
              }}
              className="card-surface p-4 sm:p-5 flex flex-col h-full"
            >
              <p className="label-micro text-brand mb-0.5">Parceiros</p>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-3">
                Patrocinadores
              </h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 flex-1 content-start">
                {sponsors.map((sponsor) => (
                  <li key={sponsor.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (sponsor.site) {
                          window.open(sponsor.site, '_blank', 'noopener,noreferrer');
                        } else {
                          setSelectedSponsor(sponsor);
                        }
                      }}
                      className="w-full aspect-[5/3] rounded-xl bg-gray-50 border border-gray-100 hover:border-brand/25 hover:shadow-sm transition-all flex items-center justify-center p-3 focus-visible:ring-2 focus-visible:ring-brand/30"
                      aria-label={sponsor.nome}
                      title={sponsor.nome}
                    >
                      <AppImage
                        src={sponsor.logo}
                        alt={sponsor.nome}
                        className="max-h-10 sm:max-h-12 w-auto max-w-full object-contain grayscale hover:grayscale-0 transition-all"
                        loading="lazy"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      </section>

      <InstitutionModal
        institution={selectedInstitution}
        onClose={() => setSelectedInstitution(null)}
      />
      <SponsorModal
        sponsor={selectedSponsor}
        onClose={() => setSelectedSponsor(null)}
      />
    </>
  );
}

function InstitutionModal({
  institution,
  onClose,
}: {
  institution: Institution | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const contacts = useMemo(() => {
    if (!institution) return [];
    return [
      institution.site && {
        icon: Globe,
        label: 'Site',
        href: institution.site,
        external: true,
      },
      institution.instagram && {
        icon: Instagram,
        label: 'Instagram',
        href: institution.instagram,
        external: true,
      },
      institution.facebook && {
        icon: Facebook,
        label: 'Facebook',
        href: institution.facebook,
        external: true,
      },
      institution.email && {
        icon: Mail,
        label: institution.email,
        href: `mailto:${institution.email}`,
      },
      institution.telefone && {
        icon: Phone,
        label: institution.telefone,
        href: `tel:${institution.telefone.replace(/\D/g, '')}`,
      },
    ].filter(Boolean) as Array<{
      icon: typeof Globe;
      label: string;
      href: string;
      external?: boolean;
    }>;
  }, [institution]);

  const copyPix = async () => {
    if (!institution?.chavePix) return;
    try {
      await navigator.clipboard.writeText(institution.chavePix);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal
      isOpen={Boolean(institution)}
      onClose={onClose}
      title={institution?.nome}
      maxWidth="2xl"
    >
      {institution && (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto">
          {institution.imagemDestaque && (
            <AppImage
              src={institution.imagemDestaque}
              alt=""
              className="w-full h-44 sm:h-56 object-cover rounded-2xl"
            />
          )}
          <div className="flex items-center gap-4">
            <AppImage
              src={institution.logo}
              alt=""
              className="w-16 h-16 rounded-2xl object-contain bg-gray-50 border border-gray-100"
            />
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{institution.descricaoCurta}</p>
              {(institution.cidade || institution.estado) && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <MapPin size={12} />
                  {[institution.endereco, institution.cidade, institution.estado]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>

          {institution.historia && (
            <div className="space-y-2">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                História
              </h4>
              <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {institution.historia}
              </div>
            </div>
          )}

          {contacts.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {contacts.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target={c.external ? '_blank' : undefined}
                    rel={c.external ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-muted text-brand text-xs font-bold hover:bg-brand hover:text-white transition-colors"
                  >
                    <c.icon size={14} />
                    {c.label}
                    {c.external && <ExternalLink size={12} />}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {institution.chavePix && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="label-micro mb-1">Chave PIX</p>
                <p className="text-sm font-bold text-gray-800 truncate">
                  {institution.chavePix}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl shrink-0"
                onClick={() => void copyPix()}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function SponsorModal({
  sponsor,
  onClose,
}: {
  sponsor: Sponsor | null;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={Boolean(sponsor)}
      onClose={onClose}
      title={sponsor?.nome}
      maxWidth="md"
    >
      {sponsor && (
        <div className="space-y-4">
          <div className="flex justify-center py-4">
            <AppImage
              src={sponsor.logo}
              alt={sponsor.nome}
              className="max-h-20 w-auto object-contain"
            />
          </div>
          {sponsor.descricao && (
            <p className="text-sm text-gray-600 text-center">{sponsor.descricao}</p>
          )}
          <ul className="space-y-2 text-sm">
            {sponsor.email && (
              <li className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-brand" /> {sponsor.email}
              </li>
            )}
            {sponsor.telefone && (
              <li className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-brand" /> {sponsor.telefone}
              </li>
            )}
            {sponsor.instagram && (
              <li>
                <a
                  href={sponsor.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-brand font-bold"
                >
                  <Instagram size={14} /> Instagram
                </a>
              </li>
            )}
            {sponsor.facebook && (
              <li>
                <a
                  href={sponsor.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-brand font-bold"
                >
                  <Facebook size={14} /> Facebook
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </Modal>
  );
}
