/**
 * Merge-safe sync of functions/.env → Firebase Gen2 env vars.
 * Awaits long-running operations. Never prints secret values.
 *
 *   node scripts/sync-functions-env.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(path.join(ROOT, 'functions', 'package.json'));
const { GoogleAuth } = require('google-auth-library');

const ENV_PATH = path.join(ROOT, 'functions', '.env');
const PROJECT = process.env.GCLOUD_PROJECT || 'eventosociais-c057d';
const REGION = process.env.FUNCTIONS_REGION || 'us-central1';

const KEEP_KEYS = [
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_PUBLIC_KEY',
  'MERCADOPAGO_WEBHOOK_SECRET',
  'MERCADOPAGO_APPLICATION_ID',
  'MERCADOPAGO_USER_ID',
  'MERCADOPAGO_MODE',
  'APP_URL',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
];

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) throw new Error(`Missing ${filePath}`);
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (KEEP_KEYS.includes(key) && val) out[key] = val;
  }
  return out;
}

function summarize(env) {
  return Object.keys(env)
    .sort()
    .map((k) => {
      const v = String(env[k] || '');
      return `${k}:{len=${v.length},pfx=${v.slice(0, 8)}}`;
    })
    .join(' ');
}

async function awaitOp(headers, opName, label) {
  const opUrl = `https://cloudfunctions.googleapis.com/v2/${opName}`;
  for (let i = 0; i < 60; i++) {
    const opRes = await fetch(opUrl, { headers });
    const opText = await opRes.text();
    let op;
    try {
      op = JSON.parse(opText);
    } catch {
      throw new Error(`${label} op non-json ${opRes.status}`);
    }
    if (!opRes.ok) {
      throw new Error(
        `${label} op poll ${opRes.status}: ${op.error?.message || opText.slice(0, 120)}`
      );
    }
    if (op.done) {
      if (op.error) {
        throw new Error(`${label} failed: ${op.error.message || JSON.stringify(op.error)}`);
      }
      return op;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`${label} op timeout`);
}

async function main() {
  const merge = loadEnvFile(ENV_PATH);
  if (!merge.MERCADOPAGO_ACCESS_TOKEN?.startsWith('APP_USR-')) {
    throw new Error('Production APP_USR token required in functions/.env');
  }
  if ((merge.MERCADOPAGO_MODE || '').toLowerCase() !== 'production') {
    throw new Error('MERCADOPAGO_MODE must be production');
  }

  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const tok = await client.getAccessToken();
  const headers = {
    Authorization: `Bearer ${tok.token}`,
    'Content-Type': 'application/json',
  };

  console.log('merge keys:', summarize(merge));

  const list2 = await fetch(
    `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/functions`,
    { headers }
  );
  const list2Json = await list2.json();
  if (!list2.ok) throw new Error(`list gen2: ${list2.status}`);

  let ok = 0;
  let fail = 0;

  for (const fn of list2Json.functions || []) {
    const name = fn.name.split('/').pop();
    const getUrl = `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/functions/${name}`;
    const getRes = await fetch(getUrl, { headers });
    const current = await getRes.json();
    if (!getRes.ok) {
      console.log('SKIP', name, getRes.status);
      fail++;
      continue;
    }

    const existing =
      (current.serviceConfig && current.serviceConfig.environmentVariables) ||
      {};
    const next = { ...existing, ...merge };

    const patchRes = await fetch(
      `${getUrl}?updateMask=serviceConfig.environmentVariables`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          serviceConfig: { environmentVariables: next },
        }),
      }
    );
    const patchBody = await patchRes.json();
    if (!patchRes.ok) {
      console.log('FAIL', name, patchRes.status, patchBody.error?.message || '');
      fail++;
      continue;
    }

    try {
      if (patchBody.name) await awaitOp(headers, patchBody.name, name);
      const verifyRes = await fetch(getUrl, { headers });
      const verified = await verifyRes.json();
      const env =
        (verified.serviceConfig &&
          verified.serviceConfig.environmentVariables) ||
        {};
      const tokenSet = Boolean(env.MERCADOPAGO_ACCESS_TOKEN);
      const mode = String(env.MERCADOPAGO_MODE || '');
      const kept = Object.keys(env)
        .filter((k) => KEEP_KEYS.includes(k))
        .sort()
        .join(',');
      console.log(`OK ${name} token=${tokenSet} mode=${mode} kept=${kept}`);
      if (tokenSet && mode === 'production') ok++;
      else fail++;
    } catch (err) {
      console.log('FAIL', name, err.message || String(err));
      fail++;
    }
  }

  console.log(`done ok=${ok} fail=${fail}`);
  if (ok === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
