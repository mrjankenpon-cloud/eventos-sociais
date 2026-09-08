const SCRIPT_ID = 'mp-security-js';
const SCRIPT_SRC = 'https://www.mercadopago.com/v2/security.js';

declare global {
  interface Window {
    MP_DEVICE_SESSION_ID?: string;
    deviceId?: string;
  }
}

export function mpViewFromPath(pathname: string): 'home' | 'item' | 'checkout' {
  if (
    pathname.includes('/inscricao') ||
    pathname.startsWith('/doacoes') ||
    pathname.includes('/sucesso')
  ) {
    return 'checkout';
  }
  if (/^\/evento\/[^/]+\/?$/.test(pathname)) return 'item';
  return 'home';
}

function readDeviceIdInputs(): string {
  if (typeof document === 'undefined') return '';
  const ids = ['deviceId', 'deviceID'];
  for (const id of ids) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    const v = String(el?.value || '').trim();
    if (v) return v;
  }
  return '';
}

/** Carrega o security.js do MP e atualiza o `view` conforme a página (home / item / checkout). */
export function ensureMpSecurityScript(view: 'home' | 'item' | 'checkout'): void {
  if (typeof document === 'undefined') return;

  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (script && script.getAttribute('view') === view) return;

  // Troca de view: remove o script antigo para o MP regenerar o Device ID no contexto certo.
  if (script) script.remove();

  script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.setAttribute('view', view);
  // Nome da variável global = deviceId (também preenche #deviceId quando existir).
  script.setAttribute('output', 'deviceId');
  document.body.appendChild(script);
}

export function readMpDeviceSessionId(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const fromGlobal = String(
    window.MP_DEVICE_SESSION_ID || window.deviceId || ''
  ).trim();
  const fromInput = readDeviceIdInputs();
  const raw = fromGlobal || fromInput;
  if (!raw || raw.length > 512 || !/^[A-Za-z0-9._-]+$/.test(raw)) {
    return undefined;
  }
  // Espelha nos inputs ocultos para o formulário / retries.
  for (const id of ['deviceId', 'deviceID']) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el && el.value !== raw) el.value = raw;
  }
  return raw;
}

export async function waitMpDeviceSessionId(
  timeoutMs = 8000
): Promise<string | undefined> {
  ensureMpSecurityScript('checkout');
  const started = Date.now();
  let id = readMpDeviceSessionId();
  while (!id && Date.now() - started < timeoutMs) {
    await new Promise((r) => window.setTimeout(r, 100));
    id = readMpDeviceSessionId();
  }
  return id;
}

/**
 * Device ID obrigatório para Checkout Pro (recomendação oficial antifraude).
 * Força view=checkout e espera mais tempo.
 */
export async function requireMpDeviceSessionId(
  timeoutMs = 12000
): Promise<string> {
  ensureMpSecurityScript('checkout');
  // Warm-up: dá tempo do security.js gerar o ID antes do submit.
  const id = await waitMpDeviceSessionId(timeoutMs);
  if (!id) {
    throw new Error(
      'Não foi possível preparar a segurança do pagamento. Recarregue a página e tente de novo, ou pague com PIX.'
    );
  }
  return id;
}
