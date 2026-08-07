export interface AppSettings {
  id: string;
  nome: string;
  descricao: string;
  email: string;
  telefone: string;
  endereco: string;
  updatedAt: string;
  createdAt: string;
}

export type AppSettingsFormData = Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>;
