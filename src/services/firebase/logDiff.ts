import type { LogCreate, LogEntry } from '../../types/log';

export type LogChange = {
  campo: string;
  de: string | number | boolean | null;
  para: string | number | boolean | null;
};

const SENSITIVE = new Set(['password', 'senha', 'token', 'secret']);

function serialize(value: unknown): string | number | boolean | null {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Diff superficial de objetos para auditoria */
export function diffChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): LogChange[] {
  const changes: LogChange[] = [];
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  for (const key of keys) {
    if (SENSITIVE.has(key)) continue;
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    const de = serialize(before?.[key]);
    const para = serialize(after?.[key]);
    if (de === para) continue;
    // Evita logs gigantes de data URLs
    const deSafe =
      typeof de === 'string' && de.startsWith('data:') ? '[data-url]' : de;
    const paraSafe =
      typeof para === 'string' && para.startsWith('data:') ? '[data-url]' : para;
    if (deSafe === paraSafe) continue;
    changes.push({ campo: key, de: deSafe, para: paraSafe });
  }

  return changes;
}

export type { LogCreate, LogEntry };
