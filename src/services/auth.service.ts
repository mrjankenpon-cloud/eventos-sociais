import { usuariosService } from './firebase/usuarios';

/** @deprecated Prefer `usuariosService` from `./firebase` */
export const authService = {
  login: (username: string, password: string) =>
    usuariosService.login(username, password),
  logout: () => usuariosService.logout(),
  create: (data: Parameters<typeof usuariosService.create>[0]) =>
    usuariosService.create(data),
  getById: (id: string) => usuariosService.getById(id),
  getAll: () => usuariosService.getAll(),
  update: (id: string, data: Parameters<typeof usuariosService.update>[1]) =>
    usuariosService.update(id, data),
  delete: (id: string) => usuariosService.delete(id),
};
