import type { Institution } from '../types/models/institution';

export const MOCK_INSTITUTIONS: Institution[] = [
  {
    id: 'inst-1',
    nome: 'Instituto Esperança',
    logo: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=200&q=80',
    imagemDestaque:
      'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=80',
    descricaoCurta: 'Apoio integral a crianças e adolescentes em vulnerabilidade.',
    historia:
      'Fundado em 2008, o Instituto Esperança oferece educação, saúde e acolhimento a famílias em situação de risco social. Com programas contínuos de mentoria e reforço escolar, já transformou a trajetória de milhares de jovens.',
    site: 'https://example.com',
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    email: 'contato@esperanca.example',
    telefone: '(11) 4000-1111',
    endereco: 'Rua da Solidariedade, 50',
    cidade: 'São Paulo',
    estado: 'SP',
    chavePix: 'contato@esperanca.example',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inst-2',
    nome: 'Lar Amigo dos Animais',
    logo: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=200&q=80',
    imagemDestaque:
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    descricaoCurta: 'Resgate, cuidado e adoção responsável de animais abandonados.',
    historia:
      'O Lar Amigo dos Animais atua no resgate e reabilitação de cães e gatos em situação de rua. Conta com clínica veterinária voluntária, programa de castração e feiras mensais de adoção.',
    site: 'https://example.com',
    instagram: 'https://instagram.com',
    facebook: '',
    email: 'adocao@laramigo.example',
    telefone: '(11) 4000-2222',
    endereco: 'Av. dos Bichos, 120',
    cidade: 'São Paulo',
    estado: 'SP',
    chavePix: '',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
