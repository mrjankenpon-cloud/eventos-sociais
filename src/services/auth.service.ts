import { usuariosService } from './firebase/usuarios';

export const authService = {
  loginWithGoogle: () => usuariosService.loginWithGoogle(),
  logout: () => usuariosService.logout(),
  invite: (data: Parameters<typeof usuariosService.invite>[0]) =>
    usuariosService.invite(data),
  getById: (id: string) => usuariosService.getById(id),
  getAll: () => usuariosService.getAll(),
  update: (id: string, data: Parameters<typeof usuariosService.update>[1]) =>
    usuariosService.update(id, data),
  delete: (id: string) => usuariosService.delete(id),
  listAccessRequests: () => usuariosService.listAccessRequests(),
  approveAccessRequest: (
    id: string,
    role?: Parameters<typeof usuariosService.approveAccessRequest>[1]
  ) => usuariosService.approveAccessRequest(id, role),
  denyAccessRequest: (id: string) => usuariosService.denyAccessRequest(id),
};
