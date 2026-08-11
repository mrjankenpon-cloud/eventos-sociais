const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

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

  async function publish(releaseId, fileName, content) {
    const createRes = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`,
      {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          source: { files: [{ name: fileName, content }] },
        }),
      }
    );
    const created = await createRes.json();
    if (!createRes.ok) {
      throw new Error(`${fileName} ruleset: ${JSON.stringify(created)}`);
    }
    console.log('ruleset', created.name);

    const releaseName = `projects/${project}/releases/${releaseId}`;
    const patchRes = await fetch(
      `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`,
      {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify({
          release: {
            name: releaseName,
            rulesetName: created.name,
          },
        }),
      }
    );
    const patched = await patchRes.json();
    console.log(releaseId, patchRes.status, JSON.stringify(patched).slice(0, 250));
    if (!patchRes.ok) {
      // create release if missing
      const createRel = await fetch(
        `https://firebaserules.googleapis.com/v1/projects/${project}/releases`,
        {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            name: releaseName,
            rulesetName: created.name,
          }),
        }
      );
      const createdRel = await createRel.json();
      console.log('createRelease', createRel.status, JSON.stringify(createdRel).slice(0, 250));
      if (!createRel.ok) {
        throw new Error(`${fileName} release failed`);
      }
    }
  }

  await publish(
    'cloud.firestore',
    'firestore.rules',
    fs.readFileSync('firestore.rules', 'utf8')
  );

  // Storage release ids vary by bucket name
  const storageContent = fs.readFileSync('storage.rules', 'utf8');
  const storageCandidates = [
    `firebase.storage/${project}.firebasestorage.app`,
    `firebase.storage/${project}.appspot.com`,
    'firebase.storage',
  ];

  // List releases to find storage
  const listRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${project}/releases`,
    { headers: h }
  );
  const list = await listRes.json();
  console.log(
    'existing releases',
    (list.releases || []).map((r) => r.name)
  );

  const storageRelease = (list.releases || []).find((r) =>
    String(r.name).includes('firebase.storage')
  );
  if (storageRelease) {
    const id = storageRelease.name.replace(`projects/${project}/releases/`, '');
    await publish(id, 'storage.rules', storageContent);
  } else {
    let published = false;
    for (const id of storageCandidates) {
      try {
        await publish(id, 'storage.rules', storageContent);
        published = true;
        break;
      } catch (e) {
        console.log('storage candidate failed', id, e.message);
      }
    }
    if (!published) {
      console.log(
        'STORAGE_SKIPPED: enable Storage in console or publish storage.rules manually'
      );
    }
  }

  // Verify firestore release
  const verify = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`,
    { headers: h }
  );
  console.log('VERIFY_FIRESTORE', await verify.text());
  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
