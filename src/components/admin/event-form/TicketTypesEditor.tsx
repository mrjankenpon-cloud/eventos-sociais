import React from 'react';
import { Plus, Ticket } from 'lucide-react';
import type { TicketType } from '../../../types/models/event';
import { createId } from '../../../lib/eventForm';
import { Input, Textarea, Button } from '../../ui';
import { cn } from '../../../lib/utils';

interface TicketTypesEditorProps {
  types: TicketType[];
  onChange: (types: TicketType[]) => void;
}

export function TicketTypesEditor({ types, onChange }: TicketTypesEditorProps) {
  const update = (id: string, patch: Partial<TicketType>) => {
    onChange(types.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const addCustom = () => {
    onChange([
      ...types,
      {
        id: createId('tt'),
        key: `custom-${Date.now()}`,
        nome: '',
        descricao: '',
        ativo: true,
        valor: 0,
        quantidade: 0,
      },
    ]);
  };

  const removeCustom = (id: string) => {
    const target = types.find((t) => t.id === id);
    if (!target || ['inteira', 'meia', 'retirada'].includes(target.key)) return;
    onChange(types.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Cada tipo é independente. Os dados abaixo são os mesmos exibidos na página pública e no
        checkout.
      </p>

      <div className="space-y-4">
        {types.map((type) => {
          const isCore = ['inteira', 'meia', 'retirada'].includes(type.key);
          return (
            <div
              key={type.id}
              className={cn(
                'rounded-2xl border p-5 sm:p-6 transition-colors',
                type.ativo
                  ? 'border-brand/20 bg-brand-muted/30'
                  : 'border-gray-100 bg-gray-50/80'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand shadow-sm shrink-0">
                    <Ticket size={18} />
                  </div>
                  <input
                    value={type.nome}
                    onChange={(e) => update(type.id, { nome: e.target.value })}
                    placeholder="Nome do ingresso"
                    className="font-black text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-brand outline-none min-w-0 flex-1"
                  />
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {type.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <input
                    type="checkbox"
                    checked={type.ativo}
                    onChange={(e) => update(type.id, { ativo: e.target.checked })}
                    className="h-5 w-5 accent-brand"
                  />
                </label>
              </div>

              <div
                className={cn(
                  'space-y-4',
                  !type.ativo && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Valor (R$)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={type.valor}
                    onChange={(e) =>
                      update(type.id, { valor: Math.max(0, Number(e.target.value) || 0) })
                    }
                    hint={type.key === 'retirada' ? 'Pode ser R$ 0,00' : undefined}
                  />
                  <Input
                    label="Quantidade disponível"
                    type="number"
                    min={0}
                    step={1}
                    value={type.quantidade}
                    onChange={(e) =>
                      update(type.id, {
                        quantidade: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      })
                    }
                  />
                </div>
                <Textarea
                  label="Descrição (opcional)"
                  value={type.descricao}
                  onChange={(e) => update(type.id, { descricao: e.target.value })}
                  rows={2}
                  placeholder=""
                />
              </div>

              {!isCore && (
                <div className="mt-4 flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeCustom(type.id)}>
                    Remover tipo
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={addCustom} className="rounded-2xl">
        <Plus size={16} />
        Adicionar tipo de ingresso
      </Button>
    </div>
  );
}
