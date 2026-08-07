/** Campos obrigatórios em todo documento Firestore do Delphos */
export interface BaseDocument {
  id: string;
  createdAt: string;
  updatedAt: string;
  ativo: boolean;
}

export type CreateInput<T extends BaseDocument> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt'
> & {
  ativo?: boolean;
};

export type UpdateInput<T extends BaseDocument> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt'>
>;
