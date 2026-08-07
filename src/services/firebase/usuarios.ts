import {
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../../firebase/auth';
import type {
  PermissionInviteInput,
  User,
  UserFormData,
  UserRole,
} from '../../types/models/user';
import {
  COLLECTIONS,
  col,
  docRef,
  mapDoc,
  stripUndefined,
  timestamps,
  touchUpdated,
  wrapError,
} from './helpers';
import { logsService } from './logs';
import { isMasterAdminUid, MASTER_ADMIN_UID } from '../../config/masterAdmin';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Doc id do convite = e-mail (permite get sem listar a coleção). */
function inviteDocId(email: string): string {
  return normalizeEmail(email);
}

function resolveLoginEmail(usernameOrEmail: string): string {
  const value = usernameOrEmail.trim();
  if (value.includes('@')) return normalizeEmail(value);

  const normalized = value.toLowerCase();
  if (normalized === 'controleadmin') {
    const mapped = import.meta.env.VITE_ADMIN_LOGIN_EMAIL as string | undefined;
    return mapped?.trim() || 'controleadmin@delphos.local';
  }

  const mapped = import.meta.env.VITE_ADMIN_LOGIN_EMAIL as string | undefined;
  if (mapped?.trim()) return mapped.trim();
  return `${value}@delphos.local`;
}

/** Garante perfil master no Firestore para o UID fixo. */
async function ensureMasterProfile(fbUser: FirebaseUser): Promise<User> {
  const email = normalizeEmail(fbUser.email || 'master@delphos.local');
  const existing = await getDoc(docRef(COLLECTIONS.usuarios, MASTER_ADMIN_UID));
  const base = existing.exists()
    ? mapDoc<User>(existing as Parameters<typeof mapDoc>[0])
    : null;

  const profile: Omit<User, 'id'> = {
    name: base?.name || fbUser.displayName || 'Administrador Master',
    email: email || base?.email || 'master@delphos.local',
    role: 'admin',
    avatar: fbUser.photoURL || base?.avatar,
    ativo: true,
    master: true,
    pending: false,
    authProvider: base?.authProvider || 'google',
    createdAt: base?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(
    docRef(COLLECTIONS.usuarios, MASTER_ADMIN_UID),
    {
      ...stripUndefined(profile as unknown as Record<string, unknown>),
      ...timestamps(),
    },
    { merge: true }
  );

  return { id: MASTER_ADMIN_UID, ...profile };
}

function withMasterFlags(profile: User): User {
  if (!isMasterAdminUid(profile.id)) return profile;
  return {
    ...profile,
    role: 'admin',
    master: true,
    ativo: true,
    pending: false,
  };
}

async function claimInviteForAuth(fbUser: FirebaseUser): Promise<User> {
  // Master UID: sempre autorizado, mesmo sem convite prévio
  if (isMasterAdminUid(fbUser.uid)) {
    return ensureMasterProfile(fbUser);
  }

  const email = normalizeEmail(fbUser.email || '');
  if (!email) {
    throw new Error('Conta Google sem e-mail. Use outra conta.');
  }

  const byUid = await getDoc(docRef(COLLECTIONS.usuarios, fbUser.uid));
  if (byUid.exists()) {
    const profile = withMasterFlags(
      mapDoc<User>(byUid as Parameters<typeof mapDoc>[0])
    );
    if (!profile.ativo) {
      throw new Error('Seu acesso está desativado. Contate um administrador.');
    }
    return profile;
  }

  const inviteId = inviteDocId(email);
  const inviteSnap = await getDoc(docRef(COLLECTIONS.usuarios, inviteId));
  if (!inviteSnap.exists()) {
    throw new Error(
      'Este e-mail não tem permissão de acesso. Peça a um administrador para cadastrá-lo em Permissões.'
    );
  }

  const invite = mapDoc<User>(inviteSnap as Parameters<typeof mapDoc>[0]);
  if (!invite.ativo) {
    throw new Error('Seu acesso está desativado. Contate um administrador.');
  }

  const profile: Omit<User, 'id'> = {
    name: invite.name || fbUser.displayName || email.split('@')[0],
    email,
    role: invite.role || 'admin',
    avatar: fbUser.photoURL || invite.avatar,
    ativo: true,
    master: false,
    pending: false,
    authProvider: 'google',
    createdAt: invite.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef(COLLECTIONS.usuarios, fbUser.uid), {
    ...stripUndefined(profile as unknown as Record<string, unknown>),
    ...timestamps(),
  });

  if (inviteId !== fbUser.uid) {
    try {
      await deleteDoc(docRef(COLLECTIONS.usuarios, inviteId));
    } catch (error) {
      console.error('[usuarios.claimInvite] delete invite', error);
    }
  }

  return { id: fbUser.uid, ...profile };
}

/** Bootstrap legado (senha) — só cria perfil se já autenticou e não há deny. */
async function profileFromPasswordAuth(fbUser: FirebaseUser): Promise<User> {
  try {
    return await claimInviteForAuth(fbUser);
  } catch {
    // Permite bootstrap do controleadmin se não houver convite ainda
    const email = normalizeEmail(fbUser.email || '');
    const isBootstrap =
      email === 'controleadmin@delphos.local' ||
      email === normalizeEmail(String(import.meta.env.VITE_ADMIN_LOGIN_EMAIL || ''));

    if (!isBootstrap) throw new Error('Sem permissão de acesso.');

    const profile: Omit<User, 'id'> = {
      name: fbUser.displayName || 'Controle Admin',
      email,
      role: 'admin',
      ativo: true,
      pending: false,
      authProvider: 'password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef(COLLECTIONS.usuarios, fbUser.uid), {
      ...stripUndefined(profile as unknown as Record<string, unknown>),
      ...timestamps(),
    });

    return { id: fbUser.uid, ...profile };
  }
}

export const usuariosService = {
  async create(data: UserFormData & { password: string }): Promise<User> {
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        normalizeEmail(data.email),
        data.password
      );
      if (data.name) {
        await updateProfile(cred.user, { displayName: data.name });
      }
      const { password: _p, ...profile } = data;
      const email = normalizeEmail(profile.email);
      await setDoc(docRef(COLLECTIONS.usuarios, cred.user.uid), {
        ...stripUndefined({
          ...profile,
          email,
          ativo: profile.ativo ?? true,
          pending: false,
          authProvider: 'password',
        } as unknown as Record<string, unknown>),
        ...timestamps(),
      });

      await logsService.record({
        acao: 'create',
        colecao: COLLECTIONS.usuarios,
        documentoId: cred.user.uid,
        descricao: `Usuário criado: ${email}`,
      });

      return {
        id: cred.user.uid,
        ...profile,
        email,
        ativo: profile.ativo ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      wrapError('usuarios.create', error);
    }
  },

  /** Cadastra permissão (nome + e-mail Google). Não cria conta Auth. */
  async invite(data: PermissionInviteInput): Promise<User> {
    try {
      const email = normalizeEmail(data.email);
      if (!email.includes('@')) {
        throw new Error('Informe um e-mail válido (conta Google).');
      }
      if (!data.name.trim()) {
        throw new Error('Informe o nome.');
      }

      const existing = await this.findByEmail(email);
      if (existing) {
        throw new Error('Este e-mail já possui permissão cadastrada.');
      }

      const role: UserRole = data.role ?? 'admin';
      const id = inviteDocId(email);
      const payload: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        name: data.name.trim(),
        email,
        role,
        ativo: data.ativo ?? true,
        pending: true,
        authProvider: 'invite',
      };

      await setDoc(docRef(COLLECTIONS.usuarios, id), {
        ...stripUndefined(payload as unknown as Record<string, unknown>),
        ...timestamps(),
      });

      await logsService.record({
        acao: 'invite',
        colecao: COLLECTIONS.usuarios,
        documentoId: id,
        descricao: `Permissão concedida: ${email}`,
        after: { name: payload.name, email, role },
      });

      return {
        id,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('[')) {
        console.error('[usuarios.invite]', error);
        throw error;
      }
      wrapError('usuarios.invite', error);
    }
  },

  async update(id: string, data: Partial<UserFormData>): Promise<User> {
    try {
      if (isMasterAdminUid(id)) {
        // Master não pode ser rebaixado/desativado
        if (data.ativo === false) {
          throw new Error('O administrador master não pode ser desativado.');
        }
        if (data.role && data.role !== 'admin') {
          throw new Error('O administrador master deve permanecer como admin.');
        }
        data = { ...data, role: 'admin', master: true, ativo: true };
      }

      const patch = { ...data };
      if (typeof patch.email === 'string') {
        patch.email = normalizeEmail(patch.email);
      }
      await updateDoc(docRef(COLLECTIONS.usuarios, id), {
        ...stripUndefined(patch as Record<string, unknown>),
        ...touchUpdated(),
      });
      const updated = await this.getById(id);
      if (!updated) throw new Error('Usuário não encontrado após atualização');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.usuarios,
        documentoId: id,
        descricao: `Usuário atualizado: ${updated.email}`,
        after: updated as unknown as Record<string, unknown>,
      });

      return withMasterFlags(updated);
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('[')) {
        console.error('[usuarios.update]', error);
        throw error;
      }
      wrapError('usuarios.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      if (isMasterAdminUid(id)) {
        throw new Error('O administrador master não pode ser removido.');
      }
      await deleteDoc(docRef(COLLECTIONS.usuarios, id));
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.usuarios,
        documentoId: id,
        descricao: 'Permissão removida',
      });
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('[')) {
        console.error('[usuarios.delete]', error);
        throw error;
      }
      wrapError('usuarios.delete', error);
    }
  },

  async getById(id: string): Promise<User | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.usuarios, id));
      if (!snap.exists()) return undefined;
      return withMasterFlags(mapDoc<User>(snap as Parameters<typeof mapDoc>[0]));
    } catch (error) {
      wrapError('usuarios.getById', error);
    }
  },

  async getAll(): Promise<User[]> {
    try {
      const q = query(col(COLLECTIONS.usuarios), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) =>
        withMasterFlags(mapDoc<User>(d))
      );
    } catch {
      const snap = await getDocs(col(COLLECTIONS.usuarios));
      return snap.docs
        .map((d) => withMasterFlags(mapDoc<User>(d)))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
  },

  async getActive(): Promise<User[]> {
    try {
      const all = await this.getAll();
      return all.filter((u) => u.ativo);
    } catch (error) {
      wrapError('usuarios.getActive', error);
    }
  },

  async search(term: string): Promise<User[]> {
    try {
      const all = await this.getAll();
      const q = term.trim().toLowerCase();
      if (!q) return all;
      return all.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    } catch (error) {
      wrapError('usuarios.search', error);
    }
  },

  async login(usernameOrEmail: string, password: string): Promise<User> {
    try {
      const email = resolveLoginEmail(usernameOrEmail);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await profileFromPasswordAuth(cred.user);
      await logsService.record({
        acao: 'login',
        colecao: COLLECTIONS.usuarios,
        documentoId: profile.id,
        descricao: `Login senha: ${profile.email}`,
        usuarioId: profile.id,
        usuarioNome: profile.name,
      });
      return profile;
    } catch (error) {
      console.error('[usuarios.login]', error);
      if (error instanceof Error && error.message.includes('permissão')) {
        await signOut(auth).catch(() => undefined);
        throw error;
      }
      throw new Error('Credenciais inválidas. Verifique seu usuário e senha.');
    }
  },

  async loginWithGoogle(): Promise<User> {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await claimInviteForAuth(cred.user);
      await logsService.record({
        acao: 'login',
        colecao: COLLECTIONS.usuarios,
        documentoId: profile.id,
        descricao: `Login Google: ${profile.email}`,
        usuarioId: profile.id,
        usuarioNome: profile.name,
      });
      return profile;
    } catch (error) {
      console.error('[usuarios.loginWithGoogle]', error);
      await signOut(auth).catch(() => undefined);
      if (error instanceof Error && !error.message.startsWith('[')) {
        if (
          error.message.includes('popup-closed') ||
          error.message.includes('cancelled')
        ) {
          throw new Error('Login com Google cancelado.');
        }
        throw error;
      }
      throw new Error('Não foi possível entrar com Google.');
    }
  },

  async logout(): Promise<void> {
    try {
      const uid = auth.currentUser?.uid ?? 'anon';
      await signOut(auth);
      await logsService.record({
        acao: 'logout',
        colecao: COLLECTIONS.usuarios,
        documentoId: uid,
        descricao: 'Logout',
      });
    } catch (error) {
      wrapError('usuarios.logout', error);
    }
  },

  async getCurrentProfile(): Promise<User | null> {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser) return null;
      try {
        return await claimInviteForAuth(fbUser);
      } catch {
        // Sessão Auth válida mas sem permissão → encerra
        await signOut(auth).catch(() => undefined);
        return null;
      }
    } catch (error) {
      wrapError('usuarios.getCurrentProfile', error);
    }
  },

  async findByEmail(email: string): Promise<User | undefined> {
    try {
      const normalized = normalizeEmail(email);
      const byId = await getDoc(docRef(COLLECTIONS.usuarios, inviteDocId(normalized)));
      if (byId.exists()) {
        return mapDoc<User>(byId as Parameters<typeof mapDoc>[0]);
      }

      const q = query(
        col(COLLECTIONS.usuarios),
        where('email', '==', normalized),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return undefined;
      return mapDoc<User>(snap.docs[0]);
    } catch (error) {
      wrapError('usuarios.findByEmail', error);
    }
  },
};
