/** Client-side persistence layer — single source of truth for domain data. */

const PREFIX = '@Delphos:db:v2:';

export const DB_KEYS = {
  events: `${PREFIX}events`,
  sponsors: `${PREFIX}sponsors`,
  institutions: `${PREFIX}institutions`,
  purchases: `${PREFIX}purchases`,
} as const;

export type DbKey = (typeof DB_KEYS)[keyof typeof DB_KEYS];

const CHANGE_EVENT = 'delphos:db-changed';

export function loadCollection<T>(key: DbKey, seed: () => T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* corrupt — reseed */
  }
  const initial = seed();
  saveCollection(key, initial);
  return initial;
}

export function saveCollection<T>(key: DbKey, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, { detail: { key } })
    );
  }
}

/** Subscribe to DB writes (same tab + other tabs via `storage`). */
export function subscribeDb(
  keys: DbKey | DbKey[],
  onChange: () => void
): () => void {
  const watch = Array.isArray(keys) ? keys : [keys];

  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<{ key: string }>).detail;
    if (detail?.key && watch.includes(detail.key as DbKey)) onChange();
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key && watch.includes(e.key as DbKey)) onChange();
  };

  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
