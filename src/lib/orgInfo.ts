/**
 * Identidade jurídica da entidade mantenedora do site,
 * conforme Comprovante de Inscrição e de Situação Cadastral (CNPJ).
 * Emitido em 16/03/2026.
 */
export const ORG = {
  brand: 'Instituto Delphos',
  shortBrand: 'DELPHOS',
  razaoSocial: 'Augusta e Respeitável Loja Simbólica Delphos',
  cnpj: '11.581.131/0001-26',
  cnpjDigits: '11581131000126',
  dataAbertura: '2010-02-12',
  dataAberturaLabel: '12 de fevereiro de 2010',
  naturezaJuridica: '322-0 — Organização Religiosa',
  atividadePrincipal:
    '94.91-0-00 — Atividades de organizações religiosas ou filosóficas',
  situacaoCadastral: 'Ativa',
  endereco: {
    logradouro: 'Rua Festival',
    numero: '96',
    bairro: 'Vila Barros',
    cidade: 'Barueri',
    uf: 'SP',
    cep: '06410-280',
  },
  telefone: '(11) 4193-5616',
  emailCadastral: 'contaltec.barueri@terra.com.br',
  emailOperacional: 'ingressos@institutodelphos.com.br',
  site: 'https://institutodelphos.com.br',
} as const;

export function orgAddressLine(): string {
  const { logradouro, numero, bairro, cidade, uf, cep } = ORG.endereco;
  return `${logradouro}, ${numero} — ${bairro}, ${cidade}/${uf} — CEP ${cep}`;
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

const UNITS = [
  '',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];
const TENS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];
const HUNDREDS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

function chunkToWords(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (rest > 0 && rest < 20) parts.push(UNITS[rest]);
  else if (rest >= 20) {
    const t = Math.floor(rest / 10);
    const u = rest % 10;
    parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
  }
  return parts.join(' e ');
}

/** Valor por extenso em reais, para o certificado de doação. */
export function amountInWordsPt(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const inteiro = Math.floor(rounded);
  const cents = Math.round((rounded - inteiro) * 100);
  if (inteiro < 0 || inteiro > 999_999_999) {
    return `${rounded.toFixed(2).replace('.', ',')} reais`;
  }

  const millions = Math.floor(inteiro / 1_000_000);
  const thousands = Math.floor((inteiro % 1_000_000) / 1000);
  const rest = inteiro % 1000;
  const parts: string[] = [];

  if (millions === 1) parts.push('um milhão');
  else if (millions > 1) parts.push(`${chunkToWords(millions)} milhões`);

  if (thousands === 1) parts.push('mil');
  else if (thousands > 1) parts.push(`${chunkToWords(thousands)} mil`);

  if (rest > 0) parts.push(chunkToWords(rest));
  if (inteiro === 0) parts.push('zero');

  const reais = inteiro === 1 ? 'real' : 'reais';
  let text = `${parts.join(' ')} ${reais}`;
  if (cents === 1) text += ' e um centavo';
  else if (cents > 0) text += ` e ${chunkToWords(cents)} centavos`;
  return text;
}

export function donationCertificateNumber(
  pedidoId: string,
  isoDate: string
): string {
  const year = new Date(isoDate || Date.now()).getFullYear() || new Date().getFullYear();
  const short = pedidoId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `DELPHOS-${year}-${short || 'DOACAO'}`;
}
