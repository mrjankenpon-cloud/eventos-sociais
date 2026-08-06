import React, { useId } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Pesquisar...',
  className,
  label = 'Pesquisar',
}: SearchFieldProps) {
  const id = useId();

  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-12 pl-11 pr-10 rounded-2xl bg-white border border-gray-100',
          'text-sm text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all'
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar pesquisa"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-50"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
