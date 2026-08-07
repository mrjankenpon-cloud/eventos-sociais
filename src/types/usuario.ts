import type { BaseDocument, CreateInput, UpdateInput } from './base';

export type UsuarioRole = 'admin' | 'editor' | 'operador' | 'viewer';

export interface Usuario extends BaseDocument {
  name: string;
  email: string;
  role: UsuarioRole;
  avatar?: string;
}

export type UsuarioCreate = CreateInput<Usuario> & { password?: string };
export type UsuarioUpdate = UpdateInput<Usuario>;
