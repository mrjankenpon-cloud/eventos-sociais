/**
 * Garante o usuário admin operacional no Firebase Auth + Firestore.
 *
 * Usuário de tela: controleadmin
 * E-mail Auth:     controleadmin@delphos.local
 * Senha:           admin@vogel
 *
 * Uso: npx tsx scripts/ensure-admin.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const ADMIN_EMAIL = 'controleadmin@delphos.local';
const ADMIN_PASSWORD = 'admin@vogel';
const ADMIN_USERNAME = 'controleadmin';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
};

if (!config.apiKey || config.apiKey === 'demo-api-key') {
  console.error(
    'Configure VITE_FIREBASE_* em .env.local (as mesmas chaves do projeto na Vercel).'
  );
  process.exit(1);
}

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function upsertProfile(uid: string) {
  await setDoc(
    doc(db, 'usuarios', uid),
    {
      name: 'Controle Admin',
      email: ADMIN_EMAIL,
      role: 'admin',
      ativo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function main() {
  console.log(`Garantindo admin "${ADMIN_USERNAME}" → ${ADMIN_EMAIL}`);

  try {
    const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    await updateProfile(cred.user, { displayName: 'Controle Admin' });
    await upsertProfile(cred.user.uid);
    console.log('OK — usuário já existia e a senha confere.');
    console.log(`Login: ${ADMIN_USERNAME}`);
    console.log(`Senha: ${ADMIN_PASSWORD}`);
    return;
  } catch {
    // continua
  }

  try {
    const created = await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );
    await updateProfile(created.user, { displayName: 'Controle Admin' });
    await upsertProfile(created.user.uid);
    console.log('OK — usuário criado.');
    console.log(`Login: ${ADMIN_USERNAME}`);
    console.log(`Senha: ${ADMIN_PASSWORD}`);
    return;
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: string }).code)
        : '';

    if (code === 'auth/email-already-in-use') {
      console.error(
        [
          `O e-mail ${ADMIN_EMAIL} já existe, mas a senha atual NÃO é "${ADMIN_PASSWORD}".`,
          '',
          'No Firebase Console → Authentication → Users:',
          `1) Abra ${ADMIN_EMAIL}`,
          '2) Reset password / defina a senha para: admin@vogel',
          '   (ou exclua o usuário e rode este script de novo)',
        ].join('\n')
      );
      process.exit(1);
    }

    console.error('Falha ao criar admin:', error);
    process.exit(1);
  }
}

main();
