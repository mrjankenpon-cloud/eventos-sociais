import type { ReactNode } from 'react';

export function DocH2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="text-xl font-black text-gray-900 tracking-tight mt-10 mb-3 scroll-mt-24"
    >
      {children}
    </h2>
  );
}

export function DocH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-base font-black text-gray-800 mt-6 mb-2">{children}</h3>
  );
}

export function DocP({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>
  );
}

export function DocOl({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600 leading-relaxed mb-4">
      {children}
    </ol>
  );
}

export function DocUl({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 leading-relaxed mb-4">
      {children}
    </ul>
  );
}

export function DocCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-brand/15 bg-brand-muted/40 px-4 py-3 mb-4">
      <p className="text-xs font-black uppercase tracking-wider text-brand mb-1">
        {title}
      </p>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto mb-5 rounded-2xl border border-gray-100">
      <table className="w-full text-left text-sm min-w-[32rem]">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 font-black text-[11px] uppercase tracking-wider text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100 align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-gray-700 leading-relaxed">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
