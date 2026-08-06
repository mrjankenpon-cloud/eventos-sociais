export interface Institution {
  id: string;
  nome: string;
  logo: string;
  imagemDestaque?: string;
  descricaoCurta: string;
  historia: string;
  site?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  chavePix?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InstitutionFormData = Omit<Institution, 'id' | 'createdAt' | 'updatedAt'>;
