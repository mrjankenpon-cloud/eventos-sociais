export interface Sponsor {
  id: string;
  nome: string;
  logo: string;
  site?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
  telefone?: string;
  descricao?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SponsorFormData = Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt'>;
