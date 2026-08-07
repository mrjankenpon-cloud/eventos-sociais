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
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../../firebase/auth';
import type { User, UserFormData } from '../../types/models/user';
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

function resolveLoginEmail(usernameOrEmail: string): string {
  const value = usernameOrEmail.trim();
  if (value.includes('@')) return value;

  const normalized = value.toLowerCase();
  // Usuário operacional sem domínio próprio
  if (normalized === 'controleadmin') {
    const mapped = import.meta.env.VITE_ADMIN_LOGIN_EMAIL as string | undefined;
    return mapped?.trim() || 'controleadmin@delphos.local';
  }

  const mapped = import.meta.env.VITE_ADMIN_LOGIN_EMAIL as string | undefined;
  if (mapped?.trim()) return mapped.trim();
  return `${value}@delphos.local`;
}

async function profileFromAuth(fbUser: FirebaseUser): Promise<User> {
  const snap = await getDoc(docRef(COLLECTIONS.usuarios, fbUser.uid));
  if (snap.exists()) {
    return mapDoc<User>(snap as Parameters<typeof mapDoc>[0]);
  }

  const profile: Omit<User, 'id'> = {
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador',
    email: fbUser.email || '',
    role: 'admin',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef(COLLECTIONS.usuarios, fbUser.uid), {
    ...stripUndefined(profile as unknown as Record<string, unknown>),
    ...timestamps(),
  });

  return { id: fbUser.uid, ...profile };
}

export const usuariosService = {
  async create(data: UserFormData & { password: string }): Promise<User> {
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      if (data.name) {
        await updateProfile(cred.user, { displayName: data.name });
      }
      const { password: _p, ...profile } = data;
      await setDoc(docRef(COLLECTIONS.usuarios, cred.user.uid), {
        ...stripUndefined({
          ...profile,
          ativo: profile.ativo ?? true,
        } as unknown as Record<string, unknown>),
        ...timestamps(),
      });

      await logsService.record({
        acao: 'create',
        colecao: COLLECTIONS.usuarios,
        documentoId: cred.user.uid,
        descricao: `Usuário criado: ${profile.email}`,
      });

      return {
        id: cred.user.uid,
        ...profile,
        ativo: profile.ativo ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      wrapError('usuarios.create', error);
    }
  },

  async getById(id: string): Promise<User | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.usuarios, id));
      if (!snap.exists()) return undefined;
      return mapDoc<User>(snap as Parameters<typeof mapDoc>[0]);
    } catch (error) {
      wrapError('usuarios.getById', error);
    }
  },

  async getAll(): Promise<User[]> {
    try {
      const q = query(col(COLLECTIONS.usuarios), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<User>(d));
    } catch (error) {
      wrapError('usuarios.getAll', error);
    }
  },

  async update(id: string, data: Partial<UserFormData>): Promise<User> {
    try {
      await updateDoc(docRef(COLLECTIONS.usuarios, id), {
        ...stripUndefined(data as Record<string, unknown>),
        ...touchUpdated(),
      });
      const updated = await this.getById(id);
      if (!updated) throw new Error('Usuário não encontrado após atualização');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.usuarios,
        documentoId: id,
        descricao: `Usuário atualizado: ${updated.email}`,
      });

      return updated;
    } catch (error) {
      wrapError('usuarios.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(docRef(COLLECTIONS.usuarios, id));
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.usuarios,
        documentoId: id,
        descricao: 'Usuário removido',
      });
    } catch (error) {
      wrapError('usuarios.delete', error);
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
      const profile = await profileFromAuth(cred.user);
      await logsService.record({
        acao: 'login',
        colecao: COLLECTIONS.usuarios,
        documentoId: profile.id,
        descricao: `Login: ${profile.email}`,
        usuarioId: profile.id,
        usuarioNome: profile.name,
      });
      return profile;
    } catch (error) {
      console.error('[usuarios.login]', error);
      throw new Error('Credenciais inválidas. Verifique seu usuário e senha.');
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
      return profileFromAuth(fbUser);
    } catch (error) {
      wrapError('usuarios.getCurrentProfile', error);
    }
  },

  async findByEmail(email: string): Promise<User | undefined> {
    try {
      const q = query(
        col(COLLECTIONS.usuarios),
        where('email', '==', email.trim().toLowerCase()),
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
