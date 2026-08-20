const TTL_MS = 2 * 60 * 1000;
const memory = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

function sessionKey(key: string): string {
  return `delphos.pub.${key}`;
}

function readSession<T>(key: string): T | undefined {
  try {
    const raw = sessionStorage.getItem(sessionKey(key));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { expires?: number; value?: T };
    if (!parsed || typeof parsed.expires !== 'number' || parsed.expires < Date.now()) {
      sessionStorage.removeItem(sessionKey(key));
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
      sessionKey(key),
      JSON.stringify({ expires, value })
    );
  } catch {
    /* quota / private mode */
  }
}

function store(key: string, value: unknown): void {
  const expires = Date.now() + TTL_MS;
  memory.set(key, { expires, value });
  writeSession(key, value, expires);
}

/** Leitura síncrona do cache (memória ou session), sem rede. */
export function peekPublicQuery<T>(key: string): T | undefined {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && mem.expires > now) return mem.value as T;
  const fromSession = readSession<T>(key);
  if (fromSession !== undefined) {
    memory.set(key, { expires: now + TTL_MS, value: fromSession });
    return fromSession;
  }
  return undefined;
}

/** Descarta cache de uma chave (ex.: após publicar evento no painel). */
export function invalidatePublicQuery(key: string): void {
  memory.delete(key);
  inflight.delete(key);
  try {
    sessionStorage.removeItem(sessionKey(key));
  } catch {
    /* ignore */
  }
}

/** Força nova leitura na rede e atualiza o cache. */
export async function refreshPublicQuery<T>(
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const task = load()
    .then((value) => {
      store(key, value);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, task);
  return task;
}

/** Evita reler Firestore ao navegar home ↔ sobre na mesma aba (2 min). */
export async function cachedPublicQuery<T>(
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const cached = peekPublicQuery<T>(key);
  if (cached !== undefined) return cached;

  return refreshPublicQuery(key, load);
}
