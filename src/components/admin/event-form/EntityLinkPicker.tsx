import { useEffect, useMemo, useState } from 'react';
import { GripVertical, Plus, Search, Trash2, X } from 'lucide-react';
import type { EventEntityLink } from '../../../types/models/event';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui';

export interface LinkableEntity {
  id: string;
  nome: string;
  logo: string;
  ativo: boolean;
  subtitle?: string;
}

interface EntityLinkPickerProps {
  title: string;
  emptyLabel: string;
  catalog: LinkableEntity[];
  links: EventEntityLink[];
  onChange: (links: EventEntityLink[]) => void;
  catalogLoading?: boolean;
}

export function EntityLinkPicker({
  title,
  emptyLabel,
  catalog,
  links,
  onChange,
  catalogLoading,
}: EntityLinkPickerProps) {
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(links.map((l) => l.id)), [links]);

  const ordered = useMemo(() => {
    return [...links]
      .sort((a, b) => a.ordem - b.ordem)
      .map((link) => {
        const entity = catalog.find((c) => c.id === link.id);
        return { link, entity };
      })
      .filter((row) => row.entity);
  }, [links, catalog]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((c) => c.ativo && !selectedIds.has(c.id))
      .filter(
        (c) =>
          !q ||
          c.nome.toLowerCase().includes(q) ||
          (c.subtitle?.toLowerCase().includes(q) ?? false)
      );
  }, [catalog, selectedIds, query]);

  const add = (id: string) => {
    onChange([...links, { id, ordem: links.length }].map((l, ordem) => ({ ...l, ordem })));
    setQuery('');
  };

  const remove = (id: string) => {
    onChange(
      links.filter((l) => l.id !== id).map((l, ordem) => ({ id: l.id, ordem }))
    );
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const list = [...links].sort((a, b) => a.ordem - b.ordem);
    const from = list.findIndex((l) => l.id === dragId);
    const to = list.findIndex((l) => l.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    onChange(list.map((l, ordem) => ({ id: l.id, ordem })));
    setDragId(null);
  };

  useEffect(() => {
    if (!pickerOpen) setQuery('');
  }, [pickerOpen]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{title}</p>
        <Button
          type="button"
          variant="secondary"
          className="rounded-2xl shrink-0"
          onClick={() => setPickerOpen((v) => !v)}
        >
          {pickerOpen ? <X size={16} /> : <Plus size={16} />}
          {pickerOpen ? 'Fechar busca' : 'Vincular'}
        </Button>
      </div>

      {pickerOpen && (
        <div className="rounded-2xl border border-brand/15 bg-brand-muted/30 p-4 space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar no cadastro..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {catalogLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Carregando...</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              Nenhum registro disponível para vincular.
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto space-y-2">
              {available.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => add(item.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-brand/30 hover:shadow-sm transition-all text-left"
                  >
                    <img
                      src={item.logo}
                      alt=""
                      className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.nome}</p>
                      {item.subtitle && (
                        <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <Plus size={16} className="text-brand shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {ordered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8 border border-dashed border-gray-200 rounded-2xl">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {ordered.map(({ link, entity }) => (
            <li
              key={link.id}
              draggable
              onDragStart={() => setDragId(link.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(link.id)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3',
                dragId === link.id && 'opacity-60 ring-2 ring-brand/20'
              )}
            >
              <span
                className="text-gray-300 cursor-grab active:cursor-grabbing shrink-0"
                title="Arrastar para reordenar"
              >
                <GripVertical size={18} />
              </span>
              <img
                src={entity!.logo}
                alt=""
                className="w-11 h-11 rounded-xl object-contain bg-gray-50 border border-gray-100 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{entity!.nome}</p>
                {entity!.subtitle && (
                  <p className="text-xs text-gray-400 truncate">{entity!.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(link.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Remover vínculo"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
