import type { SiteContent } from '../types/models/siteContent';

/**
 * Textos atuais das páginas públicas.
 * Placeholders {{...}} são substituídos em tempo de exibição com dados de ORG.
 */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  about: {
    title: 'Sobre',
    subtitle: 'Quem somos, o que fazemos e com quem caminhamos.',
    introTitle: 'O Instituto Delphos',
    introParagraphs: [
      'O **Instituto Delphos** é a face pública da **{{razaoSocial}}**, organização religiosa com situação cadastral ativa, dedicada a iniciativas de convívio, cultura e solidariedade. Desde {{dataAbertura}}, a entidade promove encontros e ações que aproximam pessoas, instituições e causas sociais.',
      'Este site reúne os eventos abertos ao público, a emissão de ingressos e o canal de doações. Cada inscrição e cada contribuição ajudam a manter a programação e o apoio às instituições parceiras cadastradas na área administrativa.',
    ],
    whatWeDoTitle: 'O que fazemos',
    whatWeDoBullets: [
      'Organizar e divulgar eventos institucionais e beneficentes, com venda de ingressos e controle de acesso.',
      'Dar visibilidade às instituições parceiras ativas, exatamente como cadastradas na aba Instituições da área administrativa.',
      'Receber doações voluntárias, com recibo/certificado para o doador.',
    ],
    partnersTitle: 'Instituições parceiras',
    partnersIntro:
      'Parceiros ativos no catálogo administrativo. A faixa da página inicial exibe o mesmo conjunto.',
    ctaBeforeLink: 'Quer apoiar o trabalho? Conheça a página de ',
    ctaLinkText: 'doações',
    ctaAfterLink: '.',
  },
  terms: {
    title: 'Termo de Uso',
    subtitle:
      'Condições para navegar no site, adquirir ingressos e fazer doações.',
    intro:
      'Ao acessar {{site}} você concorda com este Termo. O site é operado pela {{razaoSocial}}, CNPJ {{cnpj}}, com sede em {{endereco}}.',
    sections: [
      {
        title: '1. Objeto',
        paragraphs: [
          'A plataforma divulga eventos, processa inscrições e pagamentos de ingressos, e recebe doações voluntárias em favor da entidade. Não se trata de marketplace de terceiros nem de instituição financeira.',
        ],
      },
      {
        title: '2. Ingressos e eventos',
        paragraphs: [],
        bullets: [
          'A inscrição exige dados verdadeiros (nome, CPF, e-mail e telefone) para emissão do ingresso e check-in.',
          'O QR Code é pessoal e intransferível, salvo indicação em contrário no evento. Cada código libera uma entrada.',
          'Datas, horários, tipos de ingresso e vagas seguem o cadastro do evento. Encerrada a venda ou esgotadas as vagas, novas compras não são aceitas.',
          'Cancelamentos, reembolsos e alterações observam a política do evento, o Código de Defesa do Consumidor quando aplicável e as regras do meio de pagamento (Mercado Pago).',
        ],
      },
      {
        title: '3. Doações',
        paragraphs: [
          'Doações são liberalidades: não geram ingresso, contraprestação ou direito a produto. O valor é livre, a partir do mínimo indicado na página de doações. Após a confirmação do pagamento, emitimos um certificado/recibo de doação, de caráter comprobatório e de agradecimento — não substitui declaração fiscal nem garante dedutibilidade no imposto de renda.',
        ],
      },
      {
        title: '4. Pagamentos',
        paragraphs: [
          'Cobranças online são processadas pelo Mercado Pago. O DELPHOS não armazena número completo de cartão. Estornos, chargebacks e prazos seguem o provedor e a legislação brasileira.',
        ],
      },
      {
        title: '5. Conduta',
        paragraphs: [
          'É vedado usar o site para fraude, falsidade ideológica, revenda não autorizada de ingressos, tentativa de burlar estoque ou qualquer uso ilícito. Podemos recusar ou cancelar operações em caso de indício de irregularidade.',
        ],
      },
      {
        title: '6. Propriedade intelectual',
        paragraphs: [
          'Marca, logotipo, textos e layout do Instituto Delphos pertencem à entidade ou a licenciantes. Instituições parceiras mantêm direitos sobre seus próprios símbolos, exibidos com autorização cadastral.',
        ],
      },
      {
        title: '7. Limitação',
        paragraphs: [
          'O site é oferecido “como está”. Interrupções de internet, do provedor de pagamento ou de hospedagem podem ocorrer. Na medida permitida em lei, a responsabilidade limita-se ao valor efetivamente pago na operação questionada.',
        ],
      },
      {
        title: '8. Privacidade e alterações',
        paragraphs: [
          'O tratamento de dados pessoais está na Política de Privacidade. Este Termo pode ser atualizado; a versão vigente é a publicada nesta página, com efeito a partir da divulgação.',
        ],
      },
      {
        title: '9. Foro',
        paragraphs: [
          'Aplica-se a legislação da República Federativa do Brasil. Fica eleito o foro da comarca de Barueri/SP, com ressalva do foro do domicílio do consumidor quando a lei assim determinar.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacidade',
    subtitle:
      'Como tratamos dados pessoais neste site, em linha com a LGPD (Lei 13.709/2018).',
    intro:
      'Controladora: {{razaoSocial}}, CNPJ {{cnpj}}, {{endereco}}. Canal: {{email}}.',
    sections: [
      {
        title: '1. Quais dados coletamos',
        paragraphs: [],
        bullets: [
          '**Inscrição em evento:** nome, CPF, e-mail, telefone, tipos e quantidades de ingresso.',
          '**Doação:** nome ou razão social, CPF ou CNPJ, e-mail, telefone, valor e, se houver, mensagem de apoio.',
          '**Pagamento:** status e identificadores da transação no Mercado Pago — não guardamos o número completo do cartão.',
          '**Acesso ao site:** dados técnicos usuais de hospedagem (IP, navegador, páginas) para segurança e funcionamento.',
        ],
      },
      {
        title: '2. Para que usamos',
        paragraphs: [
          'Bases legais típicas: execução de contrato ou procedimentos preliminares (art. 7º, V, LGPD), cumprimento de obrigação legal (art. 7º, II) e legítimo interesse para segurança da plataforma (art. 7º, IX), sempre com equilíbrio em relação aos seus direitos.',
        ],
        bullets: [
          'Emitir ingressos, QR Codes e realizar check-in.',
          'Confirmar pagamentos e enviar e-mail com acesso ou certificado.',
          'Emitir recibo/certificado de doação e prestar contas internas.',
          'Cumprir obrigações legais, prevenir fraude e atender o titular.',
        ],
      },
      {
        title: '3. Com quem compartilhamos',
        paragraphs: [
          'Operadores necessários ao serviço: Google Firebase (hospedagem de dados), Mercado Pago (pagamento) e Resend (envio de e-mail). Instituições parceiras não recebem seu CPF/CNPJ automaticamente. Autoridades públicas somente mediante obrigação legal.',
        ],
      },
      {
        title: '4. Conservação',
        paragraphs: [
          'Pedidos, ingressos e doações são mantidos pelo tempo necessário à operação do evento, à comprovação financeira e aos prazos legais (inclusive fiscais e de defesa em eventuais disputas). Depois, os dados são eliminados ou anonimizados quando possível.',
        ],
      },
      {
        title: '5. Seus direitos',
        paragraphs: [
          'Nos termos do art. 18 da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, informação sobre compartilhamentos e revogação de consentimento, quando essa for a base utilizada. Escreva para {{email}}. Também é possível recorrer à Autoridade Nacional de Proteção de Dados (ANPD).',
        ],
      },
      {
        title: '6. Cookies e segurança',
        paragraphs: [
          'Usamos armazenamento local do navegador apenas para concluir o checkout (por exemplo, o token da compra na sessão). Não utilizamos redes de anúncios de terceiros neste site. Adotamos HTTPS, regras de acesso no banco de dados e tokens opacos para recibos.',
        ],
      },
      {
        title: '7. Crianças e atualizações',
        paragraphs: [
          'O site não se destina a cadastro de menores de 16 anos sem assistência. Esta política pode ser atualizada; a versão vigente é a desta página. O Termo de Uso complementa estas regras.',
        ],
      },
    ],
  },
  donations: {
    title: 'Doações',
    subtitle:
      'Sua contribuição fortalece eventos, convívio e o apoio às instituições parceiras.',
    intro:
      'Toda doação é voluntária e bem-vinda. Ao concluir o pagamento pelo Mercado Pago, você recebe um **certificado de doação** — um recibo para guardar e um gesto de agradecimento da {{shortBrand}}.',
    irTitle: 'Doações e Imposto de Renda',
    irParagraphs: [
      'As informações abaixo são educativas, com base na legislação brasileira vigente. **Não constituem aconselhamento jurídico ou contábil.** Confirme com seu contador ou advogado o enquadramento do seu caso.',
      'A entidade é uma **organização religiosa** (natureza jurídica 322-0), CNPJ {{cnpj}}. Doações a entidades religiosas, em regra, **não são dedutíveis no IRPF** da pessoa física. Deduções de pessoa física costumam exigir leis de incentivo específicas (por exemplo fundos da criança e do adolescente, do idoso, cultura, esporte ou saúde), quando a entidade e o projeto estão habilitados naquela norma — o que deve ser verificado caso a caso.',
      'Para **pessoa jurídica tributada pelo lucro real**, a Lei nº 9.249/1995, art. 13, inciso III, admite, em certas hipóteses, a dedução de doações a entidades civis de utilidade pública que atendam a requisitos legais, limitado em geral a **2% do lucro operacional**. Empresas no Simples Nacional ou no lucro presumido normalmente não se beneficiam dessa dedução. A qualificação da donatária (por exemplo CEBAS, títulos de utilidade pública ou registros setoriais) também influi: a natureza religiosa, por si só, não garante o benefício.',
      'O certificado emitido aqui é um **recibo de doação**: identifica doador, valor, data e a entidade beneficiária. Serve para arquivo pessoal e, quando couber, para a escrituração da empresa. Não substitui DARF, declaração de IR nem recibo de lei de incentivo.',
    ],
    aceiteBeforeLink: 'Li as informações sobre Imposto de Renda e o ',
    aceiteLinkText: 'Termo de Uso',
    aceiteAfterLink:
      '. Entendo que a doação é voluntária e que o certificado não garante dedução fiscal.',
  },
};
