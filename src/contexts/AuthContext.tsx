import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const profile = await usuariosService.getCurrentProfile();
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthProvider]', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, []);

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
