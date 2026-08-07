export interface User {
  id: string;
  name: string;
  email: string;
  /** admin=Administrador, editor=Editor, operador=Operador, viewer=Visitante */
  role: 'admin' | 'editor' | 'operador' | 'viewer';
  avatar?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = User['role'];
export type UserFormData = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
