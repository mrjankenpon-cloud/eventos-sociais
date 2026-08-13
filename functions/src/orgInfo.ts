/** Identidade jurídica — espelha src/lib/orgInfo.ts (Comprovante CNPJ). */
export const ORG = {
  brand: 'Instituto Delphos',
  shortBrand: 'DELPHOS',
  razaoSocial: 'Augusta e Respeitável Loja Simbólica Delphos',
  cnpj: '11.581.131/0001-26',
  telefone: '(11) 4193-5616',
  emailOperacional: 'ingressos@institutodelphos.com.br',
  endereco:
    'Rua Festival, 96 — Vila Barros, Barueri/SP — CEP 06410-280',
} as const;

export function donationCertificateNumber(
  pedidoId: string,
  isoDate: string
): string {
  const year =
    new Date(isoDate || Date.now()).getFullYear() || new Date().getFullYear();
  const short = pedidoId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `DELPHOS-${year}-${short || 'DOACAO'}`;
}

export function formatCpfCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return digits;
}

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
