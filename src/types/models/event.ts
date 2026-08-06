export interface Event {
  id: string;
  titulo: string;
  descricaoCurta: string;
  descricaoCompleta: string;
  banner: string;
  galeria: string[];
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  endereco: string;
  googleMaps?: string;
  gratuito: boolean;
  valor: number;
  vagas: number;
  mostrarVagas: boolean;
  mostrarValor: boolean;
  eventoDestaque: boolean;
  publicado: boolean;
  permitirInscricao: boolean;
  textoBotao: string;
  linkPagamento: string;
  createdAt: string;
  updatedAt: string;
}
