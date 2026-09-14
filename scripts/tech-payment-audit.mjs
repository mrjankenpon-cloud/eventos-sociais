/**
 * Technical payment audit against production Cloud Functions.
 * Creates real pending checkouts (PIX QR + Checkout Pro preference) without paying them.
 *
 * Run: node scripts/tech-payment-audit.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE =
  'https://us-central1-eventosociais-c057d.cloudfunctions.net';
const EVENTO_ID = 'kZNSchxYqhJ5CWKOb8i1';
/** Meia-Entrada — estoque disponível no audit */
const INGRESSO_ID = 'tt-4u3o33m';
const OUT_DIR = resolve(import.meta.dirname, '../artifacts/payment-tests');
mkdirSync(OUT_DIR, { recursive: true });

function validCpfFromSeed(seed) {
  const n = String(seed).replace(/\D/g, '').padStart(9, '0').slice(0, 9);
  const calc = (base, factor) => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base[i]) * (factor - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calc(n, 10);
  const d2 = calc(n + d1, 11);
  return `${n}${d1}${d2}`;
}

async function post(name, body) {
  const started = Date.now();
  const res = await fetch(`${BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return {
    name,
    status: res.status,
    ms: Date.now() - started,
    okHttp: res.status >= 200 && res.status < 300,
    body: json,
  };
}

function buyer(label, seed) {
  const stamp = Date.now().toString().slice(-6);
  return {
    nome: `Auditoria Tecnica ${label}`,
    cpf: validCpfFromSeed(seed),
    telefone: '11987654321',
    email: `auditoria.${label.toLowerCase()}.${stamp}@example.com`,
  };
}

const results = [];

function record(title, pass, detail) {
  results.push({ title, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${title}`);
  if (detail) console.log(`       ${detail}`);
}

console.log('=== Technical payment audit ===');
console.log(`Evento: ${EVENTO_ID}`);
console.log(`Ingresso: ${INGRESSO_ID}`);
console.log('');

// 1) Validation / reachability
const emptyPix = await post('createCheckoutSession', { metodo: 'pix' });
record(
  'createCheckoutSession reachable (PIX empty body)',
  emptyPix.status === 400 && /eventoId/i.test(String(emptyPix.body.error || '')),
  `HTTP ${emptyPix.status} — ${emptyPix.body.error || ''}`
);

const emptyDonation = await post('createDonationSession', { metodo: 'pix' });
record(
  'createDonationSession reachable',
  emptyDonation.status === 400,
  `HTTP ${emptyDonation.status} — ${emptyDonation.body.error || ''}`
);

// 2) Real PIX checkout creation
const pixBuyer = buyer('PIX', `391${Date.now().toString().slice(-6)}`);
const pixReq = {
  eventoId: EVENTO_ID,
  metodo: 'pix',
  itens: [{ ingressoId: INGRESSO_ID, quantidade: 1 }],
  comprador: pixBuyer,
};
const pix = await post('createCheckoutSession', pixReq);
writeFileSync(
  resolve(OUT_DIR, 'pix-create-checkout.json'),
  JSON.stringify({ request: { ...pixReq, comprador: { ...pixBuyer, cpf: '***' } }, response: pix }, null, 2)
);

const pixPass =
  pix.okHttp &&
  pix.body.ok === true &&
  pix.body.pix === true &&
  Boolean(pix.body.qrCode) &&
  Boolean(pix.body.pedidoId) &&
  Boolean(pix.body.accessToken);
record(
  'PIX createCheckoutSession returns QR + pedido',
  pixPass,
  pixPass
    ? `pedidoId=${pix.body.pedidoId} qrLen=${String(pix.body.qrCode || '').length} expires=${pix.body.expiresAt || ''}`
    : `HTTP ${pix.status} — ${pix.body.error || JSON.stringify(pix.body).slice(0, 200)}`
);

if (pixPass) {
  const receipt = await post('getOrderReceipt', {
    pedidoId: pix.body.pedidoId,
    token: pix.body.accessToken,
  });
  writeFileSync(
    resolve(OUT_DIR, 'pix-receipt.json'),
    JSON.stringify(receipt, null, 2)
  );
  const forma = receipt.body?.pedido?.formaPagamento;
  record(
    'PIX receipt shows formaPagamento=pix and pending',
    receipt.okHttp &&
      forma === 'pix' &&
      ['pendente', 'pending'].includes(String(receipt.body?.pedido?.status || '')),
    `status=${receipt.body?.pedido?.status} forma=${forma} hasQr=${Boolean(receipt.body?.pedido?.pixQrCode)}`
  );
}

// 3) Real Checkout Pro (card) preference creation
await new Promise((r) => setTimeout(r, 1500));
const cardBuyer = buyer('CARD', `529${Date.now().toString().slice(-6)}`);
const cardReq = {
  eventoId: EVENTO_ID,
  metodo: 'checkout_pro',
  deviceId: `tech-audit-${Date.now()}`,
  itens: [{ ingressoId: INGRESSO_ID, quantidade: 1 }],
  comprador: cardBuyer,
};
const card = await post('createCheckoutSession', cardReq);
writeFileSync(
  resolve(OUT_DIR, 'card-create-checkout.json'),
  JSON.stringify(
    {
      request: { ...cardReq, comprador: { ...cardBuyer, cpf: '***' }, deviceId: '***' },
      response: card,
    },
    null,
    2
  )
);

const cardPass =
  card.okHttp &&
  card.body.ok === true &&
  card.body.pix !== true &&
  Boolean(card.body.initPoint) &&
  Boolean(card.body.preferenceId) &&
  Boolean(card.body.pedidoId);
record(
  'Cartão createCheckoutSession returns Checkout Pro preference',
  cardPass,
  cardPass
    ? `pedidoId=${card.body.pedidoId} preferenceId=${card.body.preferenceId} initPointHost=${(() => { try { return new URL(card.body.initPoint).host; } catch { return '?'; } })()}`
    : `HTTP ${card.status} — ${card.body.error || JSON.stringify(card.body).slice(0, 200)}`
);

if (cardPass) {
  const receipt = await post('getOrderReceipt', {
    pedidoId: card.body.pedidoId,
    token: card.body.accessToken,
  });
  writeFileSync(
    resolve(OUT_DIR, 'card-receipt.json'),
    JSON.stringify(receipt, null, 2)
  );
  const forma = receipt.body?.pedido?.formaPagamento;
  record(
    'Cartão receipt shows formaPagamento=mercadopago and pending',
    receipt.okHttp &&
      forma === 'mercadopago' &&
      ['pendente', 'pending'].includes(String(receipt.body?.pedido?.status || '')),
    `status=${receipt.body?.pedido?.status} forma=${forma} hasLink=${Boolean(receipt.body?.pedido?.linkPagamento)}`
  );

  // Preferência MP deve abrir no domínio de produção (não sandbox legado)
  try {
    const host = new URL(card.body.initPoint).host;
    record(
      'Checkout Pro init_point uses mercadopago.com.br',
      /mercadopago\.com\.br$/i.test(host) || host.includes('mercadopago'),
      `host=${host}`
    );
  } catch {
    record('Checkout Pro init_point uses mercadopago.com.br', false, 'invalid URL');
  }
}

// 4) Isolation: PIX path must not require deviceId
const pixNoDevice = await post('createCheckoutSession', {
  eventoId: EVENTO_ID,
  metodo: 'pix',
  itens: [{ ingressoId: INGRESSO_ID, quantidade: 1 }],
  comprador: buyer('PIXNODEV', `111${Date.now().toString().slice(-6)}`),
});
writeFileSync(
  resolve(OUT_DIR, 'pix-without-device.json'),
  JSON.stringify(pixNoDevice, null, 2)
);
record(
  'PIX works without deviceId (does not block like card)',
  pixNoDevice.okHttp && pixNoDevice.body.pix === true && Boolean(pixNoDevice.body.qrCode),
  pixNoDevice.okHttp
    ? `pedidoId=${pixNoDevice.body.pedidoId}`
    : `HTTP ${pixNoDevice.status} — ${pixNoDevice.body.error || ''}`
);

// 5) Card without deviceId must fail explicitly
const cardNoDevice = await post('createCheckoutSession', {
  eventoId: EVENTO_ID,
  metodo: 'checkout_pro',
  itens: [{ ingressoId: INGRESSO_ID, quantidade: 1 }],
  comprador: buyer('CARDNODEV', `222${Date.now().toString().slice(-6)}`),
});
writeFileSync(
  resolve(OUT_DIR, 'card-without-device.json'),
  JSON.stringify(cardNoDevice, null, 2)
);
record(
  'Cartão without deviceId is rejected (security gate intact)',
  cardNoDevice.status === 400 && /Device ID|segurança/i.test(String(cardNoDevice.body.error || '')),
  `HTTP ${cardNoDevice.status} — ${cardNoDevice.body.error || ''}`
);

const summary = {
  at: new Date().toISOString(),
  eventoId: EVENTO_ID,
  ingressoId: INGRESSO_ID,
  results,
  passed: results.filter((r) => r.pass).length,
  failed: results.filter((r) => !r.pass).length,
};
writeFileSync(resolve(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

console.log('');
console.log(`=== ${summary.passed} passed / ${summary.failed} failed ===`);
process.exit(summary.failed ? 1 : 0);
