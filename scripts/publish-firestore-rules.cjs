/**
 * Publica apenas as regras Firestore (inclui coleção `imagens`).
 * Uso: GOOGLE_APPLICATION_CREDENTIALS=.secrets/firebase-adminsdk.json node scripts/publish-firestore-rules.cjs
 */
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

async function main() {
  const auth = new GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/firebase',
    ],
  });
  const { token } = await (await auth.getClient()).getAccessToken();
  const h = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const project = 'eventosociais-c057d';
  const content = fs.readFileSync(
    path.join(__dirname, '..', 'firestore.rules'),
    'utf8'
  );

  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`,
    {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        source: { files: [{ name: 'firestore.rules', content }] },
      }),
    }
  );
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(JSON.stringify(created));
  }
  console.log('ruleset', created.name);

  const releaseName = `projects/${project}/releases/cloud.firestore`;
  const patchRes = await fetch(
    `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`,
    {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({
        release: { name: releaseName, rulesetName: created.name },
      }),
    }
  );
  const patched = await patchRes.json();
  if (!patchRes.ok) {
    throw new Error(JSON.stringify(patched));
  }
  console.log('released', patchRes.status, patched.name || 'ok');
  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
