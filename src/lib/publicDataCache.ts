const TTL_MS = 2 * 60 * 1000;
const memory = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

function readSession<T>(key: string): T | undefined {
  try {
    const raw = sessionStorage.getItem(`delphos.pub.${key}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { expires?: number; value?: T };
    if (!parsed || typeof parsed.expires !== 'number' || parsed.expires < Date.now()) {
      sessionStorage.removeItem(`delphos.pub.${key}`);
      return undefined;
    }
    return parsed.value;
  } catch {
    return undefined;
  }
}

function writeSession(key: string, value: unknown, expires: number): void {
  try {
    sessionStorage.setItem(
      `delphos.pub.${key}`,
      JSON.stringify({ expires, value })
    );
  } catch {
    /* quota / private mode */
  }
}

/** Evita reler Firestore ao navegar home ↔ sobre na mesma aba (2 min). */
export async function cachedPublicQuery<T>(
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && mem.expires > now) return mem.value as T;

  const fromSession = readSession<T>(key);
  if (fromSession !== undefined) {
    memory.set(key, { expires: now + TTL_MS, value: fromSession });
    return fromSession;
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const task = load()
    .then((value) => {
      const expires = Date.now() + TTL_MS;
      memory.set(key, { expires, value });
      writeSession(key, value, expires);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, task);
  return task;
}
