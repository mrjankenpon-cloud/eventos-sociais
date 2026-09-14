/**
 * Static + live smoke checks for Mercado Pago card / antifraud signals.
 * Run: node scripts/validate-card-checkout.mjs
 */
import { readFileSync } from 'node:fs';
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

const picker = read('src/components/public/PaymentMethodPicker.tsx');
assert(
  /export const CARD_CHECKOUT_ENABLED = true/.test(picker),
  'CARD_CHECKOUT_ENABLED is true'
);

const donations = read('src/pages/public/Donations.tsx');
assert(
  /ensureMpSecurityScript\('checkout'\)/.test(donations),
  'Donations warms Mercado Pago Device ID on checkout view'
);

const deviceId = read('src/lib/mpDeviceId.ts');
assert(
  /deviceID/.test(deviceId) && /MP_DEVICE_SESSION_ID/.test(deviceId),
  'Device ID helper reads MP globals and deviceID alias'
);

const industry = read('functions/src/mp/industry.ts');
assert(
  /Native web/.test(industry),
  'authentication_type uses Native web (Checkout Pro industry data)'
);
assert(
  /date_created/.test(industry) && /registration_date/.test(industry),
  'industry payer sends date_created + registration_date'
);
assert(
  /category_descriptor/.test(industry) && /event_date/.test(industry),
  'preference industry items include event_date + category_descriptor'
);
assert(/local_pickup/.test(industry), 'digital shipments helper exists');

const createSession = read('functions/src/mp/createCheckoutSession.ts');
assert(
  /mpPreferenceAdditionalInfo/.test(createSession),
  'createCheckoutSession uses mpPreferenceAdditionalInfo'
);
assert(
  /shipments: mpDigitalShipments\(\)/.test(createSession),
  'createCheckoutSession sends digital shipments'
);
assert(
  /expires: true/.test(createSession) &&
    /expiration_date_to/.test(createSession),
  'createCheckoutSession sets preference expiration'
);
assert(
  /metodo === 'pix'/.test(createSession) &&
    /createPixCharge\(/.test(createSession) &&
    !/additionalInfoPayer: mpIndustryPayer/.test(createSession),
  'PIX ticket charge does not send Checkout Pro additionalInfoPayer'
);
assert(
  /mpPreferenceAdditionalInfo/.test(createSession) &&
    /payment_methods: checkoutProPaymentMethods/.test(createSession),
  'Checkout Pro path keeps preference additional_info + payment methods'
);

const donationSession = read('functions/src/mp/createDonationSession.ts');
assert(
  /mpDigitalShipments\(\)/.test(donationSession) &&
    /expiration_date_to/.test(donationSession),
  'createDonationSession sends shipments + preference expiration'
);
assert(
  /metodo === 'pix'/.test(donationSession) &&
    !/additionalInfoPayer: mpIndustryPayer/.test(donationSession),
  'Donation PIX does not send Checkout Pro additionalInfoPayer'
);

const helpers = read('functions/src/mp/helpers.ts');
assert(
  /Orders API não usa additional_info|NÃO enviar additional_info/.test(helpers),
  'createPixCharge documents that Orders must not use additional_info'
);
assert(
  !/additional_info: additionalInfo/.test(helpers) &&
    /type: 'online'/.test(helpers) &&
    /id: 'pix'/.test(helpers),
  'createPixCharge builds Orders PIX body without additional_info'
);

const base =
  'https://us-central1-eventosociais-c057d.cloudfunctions.net';

async function smoke(name) {
  const res = await fetch(`${base}/${name}`, {
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
  if (res.status === 404) {
    failures.push(`${name} returned 404 — function not deployed`);
  } else if (res.status >= 500) {
    failures.push(
      `${name} returned ${res.status}: ${body.error || text.slice(0, 160)}`
    );
  } else {
    notes.push(
      `OK: ${name} reachable (HTTP ${res.status}) — ${body.error || 'ok'}`
    );
  }
}

await smoke('createCheckoutSession');
await smoke('createDonationSession');

console.log(notes.map((n) => `  ${n}`).join('\n'));
if (failures.length) {
  console.error('\nFAILURES:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nMP antifraud signal checks passed.');
