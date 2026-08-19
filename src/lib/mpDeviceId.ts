const SCRIPT_ID = 'mp-security-js';
const SCRIPT_SRC = 'https://www.mercadopago.com/v2/security.js';

declare global {
  interface Window {
    MP_DEVICE_SESSION_ID?: string;
    deviceId?: string;
  }
}

export function mpViewFromPath(pathname: string): 'home' | 'item' | 'checkout' {
  if (pathname.includes('/inscricao') || pathname.startsWith('/doacoes')) {
    return 'checkout';
  }
  if (/^\/evento\/[^/]+\/?$/.test(pathname)) return 'item';
  return 'home';
}

/** Carrega o security.js do MP e atualiza o `view` conforme a página (home / item / checkout). */
export function ensureMpSecurityScript(view: 'home' | 'item' | 'checkout'): void {
  if (typeof document === 'undefined') return;

  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (script && script.getAttribute('view') === view) return;

  if (script) script.remove();

  script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.setAttribute('view', view);
  script.setAttribute('output', 'deviceId');
  document.body.appendChild(script);
}

export function readMpDeviceSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const fromGlobal = String(
    window.MP_DEVICE_SESSION_ID || window.deviceId || ''
  ).trim();
  const fromInput = String(
    (document.getElementById('deviceId') as HTMLInputElement | null)?.value ||
      ''
  ).trim();
  const raw = fromGlobal || fromInput;
  if (!raw || raw.length > 512 || !/^[A-Za-z0-9._-]+$/.test(raw)) {
    return undefined;
  }
  return raw;
}

export async function waitMpDeviceSessionId(
  timeoutMs = 2500
): Promise<string | undefined> {
  const started = Date.now();
  let id = readMpDeviceSessionId();
  while (!id && Date.now() - started < timeoutMs) {
    await new Promise((r) => window.setTimeout(r, 120));
    id = readMpDeviceSessionId();
  }
  return id;
}
