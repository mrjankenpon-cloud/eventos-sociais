/**
 * Sincroniza Custom Claims (role, ativo, master) a partir de usuarios/{uid}.
 * Requer Blaze + Admin SDK. Deploy: firebase deploy --only functions:syncUserClaims
 *
 * No cliente (após login): httpsCallable(functions, 'syncUserClaims')()
 * depois auth.currentUser.getIdToken(true)
 */
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const MASTER_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';

export const syncUserClaims = functions.https.onCall(async (_data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Login necessário.');
  }

  const uid = context.auth.uid;
  const snap = await admin.firestore().collection('usuarios').doc(uid).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Perfil não encontrado.');
  }

  const data = snap.data() || {};
  const rawRole = typeof data.role === 'string' ? data.role : 'viewer';
  const role = ['admin', 'editor', 'operador', 'viewer'].includes(rawRole)
    ? rawRole
    : 'viewer';
  const ativo = data.ativo !== false;
  const master = uid === MASTER_UID;

  if (!ativo && !master) {
    throw new functions.https.HttpsError('permission-denied', 'Usuário inativo.');
  }

  await admin.auth().setCustomUserClaims(uid, {
    role: master ? 'admin' : role,
    ativo: true,
    master,
  });

  return { ok: true, role: master ? 'admin' : role, master };
});
