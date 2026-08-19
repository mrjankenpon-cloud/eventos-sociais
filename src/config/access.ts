/** Administrador que recebe e valida pedidos de acesso ao painel. */
export const ACCESS_APPROVER_EMAIL = 'augustovogel82@gmail.com';

export function isGmailAddress(email: string): boolean {
  return /@(gmail|googlemail)\.com$/i.test(String(email || '').trim());
}
