import { ORG, orgAddressLine } from './orgInfo';
import type { SiteContent } from '../types/models/siteContent';

const ADDRESS = orgAddressLine();

/**
 * Conteúdo inicial das páginas, já em HTML editável.
 * Serve como exemplo: o administrador pode reescrever tudo, inclusive
 * endereço, telefone e CNPJ.
 */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  about: {
    html: `
<h1>Sobre o Instituto Delphos</h1>
<p><em>Eventos beneficentes, convívio e apoio a instituições parceiras em Barueri.</em></p>

<h2>O Instituto Delphos</h2>
<p>O <strong>Instituto Delphos</strong> é a face pública da <strong>${ORG.razaoSocial}</strong>, organização religiosa com situação cadastral ativa, dedicada a iniciativas de convívio, cultura e solidariedade. Desde ${ORG.dataAberturaLabel}, a entidade promove encontros e ações que aproximam pessoas, instituições e causas sociais.</p>
<p>Este site reúne os eventos abertos ao público, a emissão de ingressos e o canal de doações. Cada inscrição e cada contribuição ajudam a manter a programação e o apoio às instituições parceiras.</p>

<h2>O que fazemos</h2>
<ul>
  <li>Organizar e divulgar eventos institucionais e beneficentes, com venda de ingressos e controle de acesso.</li>
  <li>Dar visibilidade às instituições parceiras ativas.</li>
  <li>Receber doações voluntárias, com recibo/certificado para o doador.</li>
</ul>

<h2>Dados institucionais</h2>
<ul>
  <li><strong>Razão social:</strong> ${ORG.razaoSocial}</li>
  <li><strong>CNPJ:</strong> ${ORG.cnpj}</li>
  <li><strong>Endereço:</strong> ${ADDRESS}</li>
  <li><strong>Telefone:</strong> ${ORG.telefone}</li>
  <li><strong>E-mail:</strong> ${ORG.emailOperacional}</li>
</ul>

<p>Quer apoiar o trabalho? Conheça a página de <a href="/doacoes">doações</a>.</p>
`.trim(),
  },
  saibaMais: {
    kicker: 'Instituto',
    title: 'Delphos',
    tagline: 'Conectando Pessoas, Transformando Solidariedade em Ação',
    modalTitle: 'Instituto Delphos',
    html: `
<p>O Instituto Delphos nasce com o propósito de transformar valores como fraternidade e responsabilidade social em ações concretas para quem mais precisa. Nosso foco é promover eventos beneficentes, mobilizar doações e arrecadar recursos para apoiar e fortalecer projetos de instituições parceiras que já realizam trabalhos de grande impacto na comunidade. Atuando de forma voluntária e coletiva, conectamos pessoas, famílias e empresas a causas nobres, garantindo que a união por um objetivo comum gere resultados reais para a sociedade.</p>
<p><strong>Telefone:</strong> <a href="tel:+5511981805177">(11) 9 8180-5177</a></p>
<p><strong>E-mail:</strong> <a href="mailto:lojadelphos3852@gmail.com">lojadelphos3852@gmail.com</a></p>
`.trim(),
  },
  terms: {
    html: `
<h1>Termo de Uso</h1>
<p><em>Condições para navegar no site, adquirir ingressos e fazer doações.</em></p>
<p>Ao acessar ${ORG.site} você concorda com este Termo. O site é operado pela ${ORG.razaoSocial}, CNPJ ${ORG.cnpj}, com sede em ${ADDRESS}.</p>

<h2>1. Objeto</h2>
<p>A plataforma divulga eventos, processa inscrições e pagamentos de ingressos, e recebe doações voluntárias em favor da entidade. Não se trata de marketplace de terceiros nem de instituição financeira.</p>

<h2>2. Ingressos e eventos</h2>
<ul>
  <li>A inscrição exige dados verdadeiros (nome, CPF, e-mail e telefone) para emissão do ingresso e check-in.</li>
  <li>O QR Code é pessoal e intransferível, salvo indicação em contrário no evento. Cada código libera uma entrada.</li>
  <li>Datas, horários, tipos de ingresso e vagas seguem o cadastro do evento. Encerrada a venda ou esgotadas as vagas, novas compras não são aceitas.</li>
  <li>Cancelamentos, reembolsos e alterações observam a política do evento, o Código de Defesa do Consumidor quando aplicável e as regras do meio de pagamento (Mercado Pago).</li>
</ul>

<h2>3. Doações</h2>
<p>Doações são liberalidades: não geram ingresso, contraprestação ou direito a produto. O valor é livre, a partir do mínimo indicado na página de doações. Após a confirmação do pagamento, emitimos um certificado/recibo de doação, de caráter comprobatório e de agradecimento — não substitui declaração fiscal nem garante dedutibilidade no imposto de renda.</p>

<h2>4. Pagamentos</h2>
<p>Cobranças online são processadas pelo Mercado Pago. O DELPHOS não armazena número completo de cartão. Estornos, chargebacks e prazos seguem o provedor e a legislação brasileira.</p>

<h2>5. Conduta</h2>
<p>É vedado usar o site para fraude, falsidade ideológica, revenda não autorizada de ingressos, tentativa de burlar estoque ou qualquer uso ilícito. Podemos recusar ou cancelar operações em caso de indício de irregularidade.</p>

<h2>6. Propriedade intelectual</h2>
<p>Marca, logotipo, textos e layout do Instituto Delphos pertencem à entidade ou a licenciantes. Instituições parceiras mantêm direitos sobre seus próprios símbolos, exibidos com autorização cadastral.</p>

<h2>7. Limitação</h2>
<p>O site é oferecido “como está”. Interrupções de internet, do provedor de pagamento ou de hospedagem podem ocorrer. Na medida permitida em lei, a responsabilidade limita-se ao valor efetivamente pago na operação questionada.</p>

<h2>8. Privacidade e alterações</h2>
<p>O tratamento de dados pessoais está na <a href="/privacidade">Política de Privacidade</a>. Este Termo pode ser atualizado; a versão vigente é a publicada nesta página, com efeito a partir da divulgação.</p>

<h2>9. Foro</h2>
<p>Aplica-se a legislação da República Federativa do Brasil. Fica eleito o foro da comarca de Barueri/SP, com ressalva do foro do domicílio do consumidor quando a lei assim determinar.</p>
`.trim(),
  },
  privacy: {
    html: `
<h1>Privacidade</h1>
<p><em>Como tratamos dados pessoais neste site, em linha com a LGPD (Lei 13.709/2018).</em></p>
<p>Controladora: ${ORG.razaoSocial}, CNPJ ${ORG.cnpj}, ${ADDRESS}. Canal: ${ORG.emailOperacional}.</p>

<h2>1. Quais dados coletamos</h2>
<ul>
  <li><strong>Inscrição em evento:</strong> nome, CPF, e-mail, telefone, tipos e quantidades de ingresso.</li>
  <li><strong>Doação:</strong> nome ou razão social, CPF ou CNPJ, e-mail, telefone, valor e, se houver, mensagem de apoio.</li>
  <li><strong>Pagamento:</strong> status e identificadores da transação no Mercado Pago — não guardamos o número completo do cartão.</li>
  <li><strong>Acesso ao site:</strong> dados técnicos usuais de hospedagem (IP, navegador, páginas) para segurança e funcionamento.</li>
</ul>

<h2>2. Para que usamos</h2>
<ul>
  <li>Emitir ingressos, QR Codes e realizar check-in.</li>
  <li>Confirmar pagamentos e enviar e-mail com acesso ou certificado.</li>
  <li>Emitir recibo/certificado de doação e prestar contas internas.</li>
  <li>Cumprir obrigações legais, prevenir fraude e atender o titular.</li>
</ul>
<p>Bases legais típicas: execução de contrato ou procedimentos preliminares (art. 7º, V, LGPD), cumprimento de obrigação legal (art. 7º, II) e legítimo interesse para segurança da plataforma (art. 7º, IX), sempre com equilíbrio em relação aos seus direitos.</p>

<h2>3. Com quem compartilhamos</h2>
<p>Operadores necessários ao serviço: Google Firebase (hospedagem de dados), Mercado Pago (pagamento) e Resend (envio de e-mail). Instituições parceiras não recebem seu CPF/CNPJ automaticamente. Autoridades públicas somente mediante obrigação legal.</p>

<h2>4. Conservação</h2>
<p>Pedidos, ingressos e doações são mantidos pelo tempo necessário à operação do evento, à comprovação financeira e aos prazos legais (inclusive fiscais e de defesa em eventuais disputas). Depois, os dados são eliminados ou anonimizados quando possível.</p>

<h2>5. Seus direitos</h2>
<p>Nos termos do art. 18 da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, informação sobre compartilhamentos e revogação de consentimento, quando essa for a base utilizada. Escreva para ${ORG.emailOperacional}. Também é possível recorrer à Autoridade Nacional de Proteção de Dados (ANPD).</p>

<h2>6. Cookies e segurança</h2>
<p>Usamos armazenamento local do navegador apenas para concluir o checkout (por exemplo, o token da compra na sessão). Não utilizamos redes de anúncios de terceiros neste site. Adotamos HTTPS, regras de acesso no banco de dados e tokens opacos para recibos.</p>

<h2>7. Crianças e atualizações</h2>
<p>O site não se destina a cadastro de menores de 16 anos sem assistência. Esta política pode ser atualizada; a versão vigente é a desta página. O <a href="/termos">Termo de Uso</a> complementa estas regras.</p>
`.trim(),
  },
  donations: {
    html: `
<h1>Doações para eventos beneficentes</h1>
<p><em>Sua contribuição fortalece os eventos beneficentes do Instituto Delphos e o apoio às instituições parceiras.</em></p>
<p>Toda doação é voluntária e bem-vinda. Você pode pagar por <strong>PIX</strong> nesta página (QR Code ou copia e cola) ou com <strong>cartão de crédito</strong> (Visa, Master, Elo, Amex) ou <strong>débito Elo</strong> no Mercado Pago. Após a confirmação, você recebe um <strong>certificado de doação</strong> — um recibo para guardar e um gesto de agradecimento da ${ORG.shortBrand}.</p>

<h2>Doações e Imposto de Renda</h2>
<p>As informações abaixo são educativas, com base na legislação brasileira vigente. <strong>Não constituem aconselhamento jurídico ou contábil.</strong> Confirme com seu contador ou advogado o enquadramento do seu caso.</p>
<p>A entidade é uma <strong>organização religiosa</strong> (natureza jurídica 322-0), CNPJ ${ORG.cnpj}. Doações a entidades religiosas, em regra, <strong>não são dedutíveis no IRPF</strong> da pessoa física. Deduções de pessoa física costumam exigir leis de incentivo específicas (por exemplo fundos da criança e do adolescente, do idoso, cultura, esporte ou saúde), quando a entidade e o projeto estão habilitados naquela norma — o que deve ser verificado caso a caso.</p>
<p>Para <strong>pessoa jurídica tributada pelo lucro real</strong>, a Lei nº 9.249/1995, art. 13, inciso III, admite, em certas hipóteses, a dedução de doações a entidades civis de utilidade pública que atendam a requisitos legais, limitado em geral a <strong>2% do lucro operacional</strong>. Empresas no Simples Nacional ou no lucro presumido normalmente não se beneficiam dessa dedução. A qualificação da donatária (por exemplo CEBAS, títulos de utilidade pública ou registros setoriais) também influi: a natureza religiosa, por si só, não garante o benefício.</p>
<p>O certificado emitido aqui é um <strong>recibo de doação</strong>: identifica doador, valor, data e a entidade beneficiária. Serve para arquivo pessoal e, quando couber, para a escrituração da empresa. Não substitui DARF, declaração de IR nem recibo de lei de incentivo.</p>
<p>Ao concluir a doação, você declara ciência destas informações e do <a href="/termos">Termo de Uso</a>, entendendo que a doação é voluntária e que o certificado não garante dedução fiscal.</p>
`.trim(),
  },
};
