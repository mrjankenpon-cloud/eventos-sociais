export interface User {
  id: string;
  name: string;
  email: string;
  /** admin=Administrador, editor=Editor, operador=Operador, viewer=Visitante */
  role: 'admin' | 'editor' | 'operador' | 'viewer';
  avatar?: string;
  ativo: boolean;
  /** Convite ainda não vinculado a um login Google */
  pending?: boolean;
  authProvider?: 'google' | 'password' | 'invite';
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
