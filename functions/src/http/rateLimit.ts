const buckets = new Map<string, { n: number; resetAt: number }>();

const BOT_UA =
  /bot|crawler|spider|crawling|preview|prerender|lighthouse|pagespeed|gtmetrix|pingdom|slurp|duckduck|bingpreview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python-requests|httpclient|go-http|java\/|okhttp|scrapy|headless/i;

type RequestLike = {
  headers?: Record<string, unknown>;
  ip?: string;
};

function headerValue(
  headers: Record<string, unknown> | undefined,
  name: string
): string {
  const raw = headers?.[name] ?? headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return String(raw[0] || '');
  return String(raw || '');
}

export function requestIp(req: RequestLike): string {
  const forwarded = headerValue(req.headers, 'x-forwarded-for')
    .split(',')[0]
    .trim();
  const raw = forwarded || String(req.ip || '').replace(/^::ffff:/, '');
  if (!raw) return 'unknown';
  return raw.slice(0, 45);
}

export function requestUserAgent(req: RequestLike): string {
  return headerValue(req.headers, 'user-agent');
}

/** Clientes automáticos — não contar visita e não gastar escrita. */
export function isAutomatedClient(req: RequestLike): boolean {
  const ua = requestUserAgent(req);
  if (!ua || ua.length < 12) return true;
  return BOT_UA.test(ua);
}

export function allowAttempt(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt < now) {
    buckets.set(key, { n: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n += 1;
  return true;
}
