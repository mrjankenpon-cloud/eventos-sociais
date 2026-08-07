import { usuariosService } from './firebase/usuarios';

export const authService = {
  login: (username: string, password: string) =>
    usuariosService.login(username, password),
  loginWithGoogle: () => usuariosService.loginWithGoogle(),
  logout: () => usuariosService.logout(),
  create: (data: Parameters<typeof usuariosService.create>[0]) =>
    usuariosService.create(data),
  invite: (data: Parameters<typeof usuariosService.invite>[0]) =>
    usuariosService.invite(data),
  getById: (id: string) => usuariosService.getById(id),
  getAll: () => usuariosService.getAll(),
  update: (id: string, data: Parameters<typeof usuariosService.update>[1]) =>
    usuariosService.update(id, data),
  delete: (id: string) => usuariosService.delete(id),
};
