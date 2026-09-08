/**
 * Static + live smoke checks for Mercado Pago card (Checkout Pro) reactivation.
 * Run: node scripts/validate-card-checkout.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];
const notes = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
  else notes.push(`OK: ${msg}`);
}

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

// --- Frontend flag ---
const picker = read('src/components/public/PaymentMethodPicker.tsx');
assert(
  /export const CARD_CHECKOUT_ENABLED = true/.test(picker),
  'CARD_CHECKOUT_ENABLED is true'
);
assert(
  /onClick=\{\(\) => onChange\('checkout_pro'\)\}/.test(picker),
  'Cartão button calls onChange(checkout_pro)'
);
assert(
  !/Em atualização — use PIX/.test(picker),
  'Disabled card placeholder removed from picker'
);

const registration = read('src/pages/public/EventRegistration.tsx');
assert(
  /metodoFromUrl === 'checkout_pro'/.test(registration),
  'EventRegistration accepts ?metodo=checkout_pro'
);
assert(
  /Pagar \$\{formatCurrency\(total\)\} com cartão/.test(registration),
  'EventRegistration CTA supports card label'
);

const donations = read('src/pages/public/Donations.tsx');
assert(
  /checkout_pro/.test(donations) && /CARD_CHECKOUT_ENABLED/.test(donations),
  'Donations still wires CARD_CHECKOUT_ENABLED + checkout_pro'
);

const orderSuccess = read('src/pages/public/OrderSuccess.tsx');
assert(
  /Tentar com outro cartão/.test(orderSuccess) &&
    /CARD_CHECKOUT_ENABLED/.test(orderSuccess),
  'OrderSuccess exposes retry-with-card when enabled'
);

// --- Backend still has Checkout Pro path ---
const createSession = read('functions/src/mp/createCheckoutSession.ts');
assert(
  /checkoutProPaymentMethods\(\)/.test(createSession),
  'createCheckoutSession uses checkoutProPaymentMethods'
);
assert(
  /\/checkout\/preferences/.test(createSession),
  'createCheckoutSession posts /checkout/preferences'
);
assert(
  /metodoHint === 'checkout_pro'/.test(createSession),
  'createCheckoutSession rate-limits card attempts'
);

const helpers = read('functions/src/mp/helpers.ts');
assert(
  /excluded_payment_methods: \[\{ id: 'pix' \}\]/.test(helpers),
  'Checkout Pro excludes PIX (PIX stays on-site Orders API)'
);
assert(/installments: 12/.test(helpers), 'Checkout Pro allows up to 12 installments');

const donationSession = read('functions/src/mp/createDonationSession.ts');
assert(
  /\/checkout\/preferences/.test(donationSession),
  'createDonationSession still supports Checkout Pro'
);

const index = read('functions/src/index.ts');
assert(
  /createCheckoutSession/.test(index) && /createDonationSession/.test(index),
  'MP session functions are exported'
);

// --- Live Functions smoke (no payment created) ---
const base =
  'https://us-central1-eventosociais-c057d.cloudfunctions.net';

async function smoke(name) {
  const url = `${base}/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  // Expect 4xx validation (function up), not 404/5xx deployment failure.
  if (res.status === 404) {
    failures.push(`${name} returned 404 — function not deployed`);
  } else if (res.status >= 500) {
    failures.push(
      `${name} returned ${res.status}: ${body.error || text.slice(0, 160)}`
    );
  } else {
    notes.push(
      `OK: ${name} reachable (HTTP ${res.status}) — ${body.error || 'validated request'}`
    );
  }
}

await smoke('createCheckoutSession');
await smoke('createDonationSession');
await smoke('mpWebhook');

console.log(notes.map((n) => `  ${n}`).join('\n'));
if (failures.length) {
  console.error('\nFAILURES:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nCard checkout reactivation checks passed.');
