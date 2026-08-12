import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/auth';
import { User } from '../types/models/user';
import { usuariosService } from '../services/firebase/usuarios';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const restoreGen = useRef(0);
  const recoveryAttempted = useRef(false);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const redirected = await usuariosService.completeGoogleRedirectIfAny();
        if (!cancelled && redirected) {
          setUser(redirected);
        }
      } catch (error) {
        console.error('[AuthProvider] google redirect', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      const gen = ++restoreGen.current;

      try {
        if (!fbUser) {
          recoveryAttempted.current = false;
          // Só limpa se este callback ainda for o mais recente
          if (gen === restoreGen.current) {
            setUser(null);
          }
          return;
        }

        // Mesmo UID já em memória (ex.: refresh de token) — não revalida nem arrisca signOut
        if (userRef.current?.id === fbUser.uid) {
          return;
        }

        try {
          const profile = await usuariosService.getCurrentProfile();
          if (gen !== restoreGen.current) return;

          if (profile) {
            recoveryAttempted.current = false;
            setUser(profile);
            return;
          }

          // getCurrentProfile devolveu null: só aceita logout se Auth também perdeu a sessão
          if (!auth.currentUser) {
            setUser(null);
            return;
          }

          // Auth ainda válida — preserva usuário em memória se houver
          if (!userRef.current) {
            setUser(null);
          }
        } catch (error) {
          console.error('[AuthProvider] profile restore', error);
          if (gen !== restoreGen.current) return;

          // Nunca zera sessão enquanto Firebase Auth ainda tem currentUser
          if (!auth.currentUser) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('[AuthProvider]', error);
        if (gen === restoreGen.current && !auth.currentUser) {
          setUser(null);
        }
      } finally {
        if (gen === restoreGen.current) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      restoreGen.current += 1;
      unsub();
    };
  }, []);

  // Recuperação: Auth tem sessão, React perdeu o perfil (race / HMR / erro transitório)
  useEffect(() => {
    if (isLoading || user || !auth.currentUser || recoveryAttempted.current) return;

    recoveryAttempted.current = true;
    let cancelled = false;
    const gen = ++restoreGen.current;

    void (async () => {
      try {
        const profile = await usuariosService.getCurrentProfile();
        if (cancelled || gen !== restoreGen.current) return;
        if (profile) {
          setUser(profile);
          recoveryAttempted.current = false;
        }
      } catch (error) {
        console.error('[AuthProvider] recovery', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const profile = await usuariosService.login(usernameOrEmail, password);
    setUser(profile);
    return profile;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const profile = await usuariosService.loginWithGoogle();
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    restoreGen.current += 1;
    await usuariosService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
