/**
 * DELPHOS Cloud Functions — Mercado Pago + stubs legados.
 *
 * Carrega functions/.env em runtime local / quando o arquivo existir no deploy.
 * Secrets reais NUNCA vão no Git (.env está no .gitignore).
 */
import * as path from 'path';
import * as fs from 'fs';

(function loadLocalEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
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
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
})();

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export { confirmPayment } from './confirmPayment';
export { sendEmail } from './sendEmail';
export { generateTickets } from './generateTickets';
export { cancelOrder } from './cancelOrder';
export { syncUserClaims } from './syncUserClaims';

export { createCheckoutSession } from './mp/createCheckoutSession';
export { mpWebhook } from './mp/webhook';
export {
  expirePendingOrders,
  expirePendingOrdersHttp,
} from './mp/expirePendingOrders';
export { getOrderReceipt } from './mp/getOrderReceipt';
export { refundPayment } from './mp/refundPayment';
export {
  requestGuestTicketsEmail,
  getGuestTickets,
} from './email/guestHttp';

/** Health ping da runtime de Functions */
export const ping = functions.https.onRequest((_req, res) => {
  res.json({
    ok: true,
    service: 'delphos-functions',
    ts: new Date().toISOString(),
  });
});
