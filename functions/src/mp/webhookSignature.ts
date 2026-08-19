import { createHmac, timingSafeEqual } from 'crypto';

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      const inner = firstString(value[0]);
      if (inner) return inner;
      continue;
    }
    if (value && typeof value === 'object') continue;
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

/** `data.id` vem na query (`data.id` ou `data: { id }`) ou no JSON. */
export function extractWebhookDataId(req: {
  query?: Record<string, unknown>;
  body?: unknown;
}): string {
  const q = req.query || {};
  const nestedQuery =
    q.data && typeof q.data === 'object' && !Array.isArray(q.data)
      ? (q.data as Record<string, unknown>)
      : {};
  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  const nestedBody =
    body.data && typeof body.data === 'object' && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : {};

  return firstString(
    q['data.id'],
    nestedQuery.id,
    nestedBody.id,
    body.id,
    q.id
  );
}

export function webhookSignatureManifests(
  dataId: string,
  requestId: string,
  ts: string
): string[] {
  const idVariants = Array.from(
    new Set(
      [dataId, dataId.toLowerCase(), dataId.replace(/-/g, '')].filter(Boolean)
    )
  );
  const manifests: string[] = [];
  if (idVariants.length === 0) {
    manifests.push(`request-id:${requestId};ts:${ts};`);
  } else {
    for (const id of idVariants) {
      manifests.push(`id:${id};request-id:${requestId};ts:${ts};`);
    }
  }
  return manifests;
}

export function hmacHexMatches(secret: string, manifest: string, hash: string): boolean {
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return expected === hash;
  }
}

export function verifyMpWebhookSignature(input: {
  secret: string;
  xSignature: string;
  xRequestId: string;
  dataId: string;
}): boolean {
  if (!input.secret || !input.xSignature) return false;

  const parts: Record<string, string> = {};
  for (const part of input.xSignature.split(',')) {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  return webhookSignatureManifests(input.dataId, input.xRequestId, ts).some(
    (manifest) => hmacHexMatches(input.secret, manifest, hash)
  );
}
