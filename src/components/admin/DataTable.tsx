import React from 'react';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  className?: string;
  toolbar?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  stickyHeader = true,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  emptyIcon = Inbox,
  className,
  toolbar,
}: DataTableProps<T>) {
  return (
    <div className={cn('card-surface overflow-hidden min-w-0', className)}>
      {toolbar && (
        <div className="p-4 sm:p-5 border-b border-gray-100">{toolbar}</div>
      )}

      {data.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[520px] sm:min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 sm:px-6 py-3.5 label-micro whitespace-nowrap',
                      stickyHeader && 'sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm',
                      col.hideOnMobile && 'hidden md:table-cell',
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    'border-b border-gray-50 last:border-0 transition-colors',
                    'hover:bg-brand-muted/40',
                    onRowClick && 'cursor-pointer focus-visible:bg-brand-muted/60 outline-none'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 sm:px-6 py-3.5 sm:py-4 text-sm text-gray-700 align-middle',
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.className
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
