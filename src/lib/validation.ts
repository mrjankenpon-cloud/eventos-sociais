/**
 * CPF Validation Algorithm
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/[^\d]/g, '');

  if (cleanCPF.length !== 11) return false;
  
  // All same digits are invalid
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

/**
 * Mask for CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
  const numbers = value.replace(/[^\d]/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** CNPJ: 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
  const n = value.replace(/\D/g, '').slice(0, 14);
  return n
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function validateCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const calc = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += Number(d[i]) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function validateCpfOrCnpj(value: string): boolean {
  const d = value.replace(/\D/g, '');
  if (d.length === 11) return validateCPF(d);
  if (d.length === 14) return validateCNPJ(d);
  return false;
}

/**
 * Mask for Brazilian phone: (00) 0000-0000 or (00) 00000-0000
 */
export function maskPhone(value: string): string {
  const n = value.replace(/\D/g, '').slice(0, 11);
  if (n.length === 0) return '';
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) {
    return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  }
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

/**
 * Mask for CEP: 00000-000
 */
export function maskCEP(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers.replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export type PhoneCountryOption = {
  code: string;
  dial: string;
  name: string;
  /** Dígitos nacionais (DDD/área + número), sem DDI */
  minNational: number;
  maxNational: number;
};

/** DDI padrão Brasil (+55). Outros países: validação mais flexível. */
export const PHONE_COUNTRIES: PhoneCountryOption[] = [
  { code: 'BR', dial: '55', name: 'Brasil', minNational: 10, maxNational: 11 },
  { code: 'AR', dial: '54', name: 'Argentina', minNational: 10, maxNational: 12 },
  { code: 'UY', dial: '598', name: 'Uruguai', minNational: 8, maxNational: 9 },
  { code: 'PY', dial: '595', name: 'Paraguai', minNational: 9, maxNational: 10 },
  { code: 'CL', dial: '56', name: 'Chile', minNational: 9, maxNational: 11 },
  { code: 'PT', dial: '351', name: 'Portugal', minNational: 9, maxNational: 9 },
  { code: 'US', dial: '1', name: 'EUA / Canadá', minNational: 10, maxNational: 10 },
  { code: 'OTHER', dial: '', name: 'Outro', minNational: 6, maxNational: 15 },
];

/**
 * Telefone BR: DDD + 8 (fixo) ou DDD + 9 (celular) → 10 ou 11 dígitos.
 * Aceita string com máscara ou só dígitos; ignora DDI 55 se presente.
 */
export function validateBrazilianPhone(phone: string): boolean {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('55') && clean.length >= 12) {
    clean = clean.slice(2);
  }
  if (clean.length !== 10 && clean.length !== 11) return false;
  const ddd = Number(clean.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  return true;
}

/**
 * @deprecated Prefer validateBrazilianPhone — mantido para compatibilidade.
 * Agora aceita fixo (10) e celular (11).
 */
export function validatePhone(phone: string): boolean {
  return validateBrazilianPhone(phone);
}

export function validateNationalPhone(
  nationalDigits: string,
  country: PhoneCountryOption
): boolean {
  const digits = nationalDigits.replace(/\D/g, '');
  if (country.code === 'BR') {
    return validateBrazilianPhone(digits);
  }
  return (
    digits.length >= country.minNational &&
    digits.length <= country.maxNational
  );
}

/** Formata valor final com DDI, ex.: +55 (11) 3456-7890 */
export function formatPhoneWithDial(
  dial: string,
  nationalDigits: string,
  countryCode: string
): string {
  const national = nationalDigits.replace(/\D/g, '');
  const d = dial.replace(/\D/g, '');
  if (!d || !national) return '';
  if (countryCode === 'BR') {
    return `+${d} ${maskPhone(national)}`;
  }
  return `+${d} ${national}`;
}
