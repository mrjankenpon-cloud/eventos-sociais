/**
 * DELPHOS Cloud Functions — stubs (sem integrações externas ainda).
 * Deploy futuro: firebase deploy --only functions
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export { confirmPayment } from './confirmPayment';
export { sendEmail } from './sendEmail';
export { generateTickets } from './generateTickets';
export { cancelOrder } from './cancelOrder';
export { syncUserClaims } from './syncUserClaims';

/** Health ping da runtime de Functions */
export const ping = functions.https.onRequest((_req, res) => {
  res.json({ ok: true, service: 'delphos-functions', ts: new Date().toISOString() });
});
