import { useState } from 'react';
import { BookOpen, ClipboardList, Printer } from 'lucide-react';
import { PageHeader } from '../../components/admin/PageHeader';
import { Button } from '../../components/ui';
import { cn } from '../../lib/utils';
import { ManualDoc, MANUAL_NAV } from './docs/ManualDoc';
import { ReportDoc } from './docs/ReportDoc';

type Tab = 'manual' | 'relatorio';

export default function Documentation() {
  const [tab, setTab] = useState<Tab>('manual');

  return (
    <div className="space-y-6 min-w-0 print:space-y-4">
      <PageHeader
        title="Documentação"
        subtitle="Manual do painel (passo a passo) e relatório das ferramentas do site."
        actions={
          <Button
            type="button"
            variant="secondary"
            className="rounded-2xl print:hidden"
            onClick={() => window.print()}
          >
            <Printer size={16} aria-hidden="true" />
            Imprimir
          </Button>
        }
      />

      <div
        className="flex gap-2 p-1 rounded-2xl bg-gray-100 w-full sm:w-fit print:hidden"
        role="tablist"
        aria-label="Tipo de documento"
      >
        <TabButton
          active={tab === 'manual'}
          onClick={() => setTab('manual')}
          icon={BookOpen}
          label="Manual do usuário"
        />
        <TabButton
          active={tab === 'relatorio'}
          onClick={() => setTab('relatorio')}
          icon={ClipboardList}
          label="Relatório do site"
        />
      </div>

      {tab === 'manual' ? (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <nav
            aria-label="Capítulos do manual"
            className="lg:w-56 shrink-0 lg:sticky lg:top-4 print:hidden"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
              Capítulos
            </p>
            <ul className="space-y-0.5">
              {MANUAL_NAV.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block text-xs font-semibold text-gray-500 hover:text-brand rounded-lg px-2 py-1.5 leading-snug"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <ManualDoc />
        </div>
      ) : (
        <ReportDoc />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BookOpen;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors',
        active ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-800'
      )}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
