/**
 * Administrador master do Delphos.
 * Este UID tem acesso irrestrito e não pode ser removido/desativado pela UI.
 */
export const MASTER_ADMIN_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';

export function isMasterAdminUid(uid: string | null | undefined): boolean {
  return Boolean(uid && uid === MASTER_ADMIN_UID);
}

export function isMasterAdminUser(
  user: { id: string; master?: boolean } | null | undefined
): boolean {
  if (!user) return false;
  return user.master === true || isMasterAdminUid(user.id);
}
