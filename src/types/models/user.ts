export interface User {
  id: string;
  name: string;
  email: string;
  /** admin=Administrador, editor=Editor, operador=Operador, viewer=Visitante */
  role: 'admin' | 'editor' | 'operador' | 'viewer';
  avatar?: string;
  ativo: boolean;
  /** Administrador master (protegido) */
  master?: boolean;
  /** Convite ainda não vinculado a um login Google */
  pending?: boolean;
  authProvider?: 'google' | 'password' | 'invite';
  /** Último heartbeat no painel (ISO). */
  lastSeenAt?: string;
  /** Sessão aberta no painel até timeout ou logout. */
  presenceActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = User['role'];
export type UserFormData = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

export type PermissionInviteInput = {
  name: string;
  email: string;
  role?: UserRole;
  ativo?: boolean;
};
