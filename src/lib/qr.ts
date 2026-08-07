/** Gera códigos e hashes não adivinháveis para tickets/QR. */

function randomBytesHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, '0')
    ).join('');
  }
  // Fallback Node / ambientes sem subtle
  return randomBytesHex(32);
}

export interface TicketQrPayload {
  ticketId: string;
  codigo: string;
  hash: string;
  createdAt: string;
  status: string;
}

/** Código humano + hash criptográfico únicos */
export async function generateTicketQrSecrets(ticketId: string): Promise<{
  codigo: string;
  hash: string;
  createdAt: string;
}> {
  const createdAt = new Date().toISOString();
  const nonce = randomBytesHex(16);
  const codigo = `DEL-${randomBytesHex(4).toUpperCase()}-${randomBytesHex(6).toUpperCase()}`;
  const hash = await sha256Hex(`${ticketId}|${codigo}|${nonce}|${createdAt}`);
  return { codigo, hash, createdAt };
}

/** Payload embutido no QR (JSON compacto) — impossível de adivinhar sem o hash */
export function buildQrPayload(data: TicketQrPayload): string {
  return JSON.stringify({
    t: data.ticketId,
    c: data.codigo,
    h: data.hash,
    s: data.status,
    ts: data.createdAt,
  });
}

export function parseQrPayload(raw: string): Partial<TicketQrPayload> | null {
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed) as Record<string, string>;
      return {
        ticketId: parsed.t || parsed.ticketId,
        codigo: parsed.c || parsed.codigo,
        hash: parsed.h || parsed.hash,
        status: parsed.s || parsed.status,
        createdAt: parsed.ts || parsed.createdAt,
      };
    }
    // Aceita código puro ou hash puro
    if (trimmed.startsWith('DEL-')) return { codigo: trimmed };
    if (/^[a-f0-9]{32,}$/i.test(trimmed)) return { hash: trimmed };
    return { codigo: trimmed };
  } catch {
    return { codigo: raw.trim() };
  }
}
