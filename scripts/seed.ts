/**
 * Seed Delphos — popula Firestore/Auth com dados iniciais.
 *
 * Uso:
 *   npx tsx scripts/seed.ts
 *
 * Requer .env / .env.local com VITE_FIREBASE_* e opcionalmente:
 *   SEED_ADMIN_EMAIL=controleadmin@delphos.local
 *   SEED_ADMIN_PASSWORD=admin@vogel
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
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
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

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
};

if (!config.apiKey || config.apiKey === 'demo-api-key') {
  console.error('Configure VITE_FIREBASE_* no .env.local antes do seed.');
  process.exit(1);
}

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL =
  process.env.SEED_ADMIN_EMAIL ||
  process.env.VITE_ADMIN_LOGIN_EMAIL ||
  'controleadmin@delphos.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin@vogel';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=1200';

async function ensureAdmin() {
  try {
    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('Admin já existe — autenticado.');
    } catch {
      const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      await updateProfile(cred.user, { displayName: 'Administrador Delphos' });
      console.log('Admin criado:', ADMIN_EMAIL);
    }

    const uid = auth.currentUser!.uid;
    await setDoc(
      doc(db, 'usuarios', uid),
      {
        name: 'Administrador Delphos',
        email: ADMIN_EMAIL,
        role: 'admin',
        ativo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return uid;
  } catch (error) {
    console.error('Falha ao criar admin:', error);
    throw error;
  }
}

async function seed() {
  console.log('→ Seed Delphos iniciando...');
  const adminId = await ensureAdmin();

  await setDoc(
    doc(db, 'configuracoes', 'app'),
    {
      nomeSistema: 'DELPHOS',
      logotipo: '',
      descricao: 'Gestão de eventos beneficentes e institucionais.',
      email: 'contato@ong.org.br',
      telefone: '+55 (11) 99999-9999',
      endereco: 'Sede Social - São Paulo - SP',
      rodape: '© DELPHOS — Eventos sociais',
      redesSociais: {
        instagram: 'https://instagram.com/',
        facebook: 'https://facebook.com/',
        site: 'https://example.org',
      },
      tema: { primaria: '#1655a3', modo: 'claro' },
      ativo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  console.log('✓ Configuração inicial');

  const sponsors = [];
  for (const [i, nome] of [
    'Patrocinador Alfa',
    'Patrocinador Beta',
    'Patrocinador Gama',
  ].entries()) {
    const ref = await addDoc(collection(db, 'patrocinadores'), {
      nome,
      logo: PLACEHOLDER_IMG,
      site: 'https://example.org',
      descricao: `Parceiro institucional ${nome}`,
      ativo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    sponsors.push(ref.id);
    console.log(`✓ Patrocinador ${i + 1}:`, nome);
  }

  const institutions = [];
  for (const [i, nome] of ['Instituto Esperança', 'Associação Vida'].entries()) {
    const ref = await addDoc(collection(db, 'instituicoes'), {
      nome,
      logo: PLACEHOLDER_IMG,
      descricao: `Instituição beneficiária ${nome}`,
      historia: '',
      site: 'https://example.org',
      email: 'contato@example.org',
      telefone: '11999999999',
      pix: 'pix@example.org',
      ativo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    institutions.push(ref.id);
    console.log(`✓ Instituição ${i + 1}:`, nome);
  }

  const events = [];
  const eventDefs = [
    {
      titulo: 'Noite Beneficente Delphos',
      resumo: 'Jantar solidário em prol das instituições parceiras.',
      data: '2026-09-20',
      horaInicio: '19:00',
      horaFim: '23:00',
    },
    {
      titulo: 'Corrida pela Vida',
      resumo: 'Evento esportivo com arrecadação para tratamentos.',
      data: '2026-10-12',
      horaInicio: '07:00',
      horaFim: '12:00',
    },
  ];

  for (const def of eventDefs) {
    const ref = await addDoc(collection(db, 'eventos'), {
      titulo: def.titulo,
      subtitulo: '',
      categoria: 'Beneficente',
      resumo: def.resumo,
      descricaoCompleta: `<p>${def.resumo}</p>`,
      regulamento: '',
      imagemPrincipal: PLACEHOLDER_IMG,
      galeria: [],
      galeriaUrls: [],
      data: def.data,
      horaInicio: def.horaInicio,
      horaFim: def.horaFim,
      local: 'Centro de Eventos',
      endereco: 'Av. Paulista, 1000',
      cidade: 'São Paulo',
      cep: '01310-100',
      mapa: '',
      quantidadeMaxima: 100,
      quantidadeRestante: 100,
      vagasVendidasCompetindo: 0,
      possuiPatrocinadores: true,
      possuiInstituicao: true,
      patrocinadores: sponsors.map((id, ordem) => ({ id, ordem })),
      instituicoes: institutions.map((id, ordem) => ({ id, ordem })),
      status: 'publicado',
      eventoDestaque: true,
      permitirInscricao: true,
      permitirCompraOnline: true,
      permitirRetiradaGratuita: false,
      exibirMapa: true,
      exibirGaleria: true,
      mostrarVagas: true,
      mostrarValor: true,
      textoBotao: 'Garantir minha vaga',
      linkPagamento: '',
      gratuito: false,
      valor: 50,
      ativo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    events.push(ref.id);

    await setDoc(doc(db, 'ingressos', `tt-${ref.id}-inteira`), {
      nome: 'Inteira',
      key: 'inteira',
      descricao: '',
      valor: 50,
      quantidade: 100,
      quantidadeVendida: 0,
      quantidadeDisponivel: 100,
      limitePorCompra: 10,
      eventoId: ref.id,
      ativo: true,
      natureza: 'entrada',
      competeVagasEvento: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✓ Evento:', def.titulo);
  }

  for (let i = 0; i < 3; i++) {
    await addDoc(collection(db, 'banners'), {
      titulo: `Banner ${i + 1}`,
      subtitulo: 'DELPHOS',
      imagemDesktop: PLACEHOLDER_IMG,
      imagemMobile: PLACEHOLDER_IMG,
      eventoId: events[i % events.length],
      ordem: i,
      ativo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`✓ Banner ${i + 1}`);
  }

  await addDoc(collection(db, 'logs'), {
    usuarioId: adminId,
    usuarioNome: 'Administrador Delphos',
    acao: 'seed',
    colecao: 'sistema',
    documentoId: 'seed',
    descricao: 'Seed inicial executado',
    dataHora: new Date().toISOString(),
    ativo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log('\nSeed concluído.');
  console.log('Login admin:', ADMIN_EMAIL);
  console.log('Senha:', ADMIN_PASSWORD);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
