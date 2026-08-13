import { Link } from 'react-router-dom';
import { LegalPage, LegalSection } from '../../components/public/LegalPage';
import { ORG, orgAddressLine } from '../../lib/orgInfo';
import { ROUTES } from '../../config';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacidade"
      subtitle="Como tratamos dados pessoais neste site, em linha com a LGPD (Lei 13.709/2018)."
    >
      <p>
        Controladora: {ORG.razaoSocial}, CNPJ {ORG.cnpj}, {orgAddressLine()}.
        Canal: {ORG.emailOperacional}.
      </p>

      <LegalSection title="1. Quais dados coletamos">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-gray-900">Inscrição em evento:</strong> nome,
            CPF, e-mail, telefone, tipos e quantidades de ingresso.
          </li>
          <li>
            <strong className="text-gray-900">Doação:</strong> nome ou razão
            social, CPF ou CNPJ, e-mail, telefone, valor e, se houver,
            mensagem de apoio.
          </li>
          <li>
            <strong className="text-gray-900">Pagamento:</strong> status e
            identificadores da transação no Mercado Pago — não guardamos o
            número completo do cartão.
          </li>
          <li>
            <strong className="text-gray-900">Acesso ao site:</strong> dados
            técnicos usuais de hospedagem (IP, navegador, páginas) para
            segurança e funcionamento.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Para que usamos">
        <ul className="list-disc pl-5 space-y-2">
          <li>Emitir ingressos, QR Codes e realizar check-in.</li>
          <li>Confirmar pagamentos e enviar e-mail com acesso ou certificado.</li>
          <li>Emitir recibo/certificado de doação e prestar contas internas.</li>
          <li>Cumprir obrigações legais, prevenir fraude e atender o titular.</li>
        </ul>
        <p>
          Bases legais típicas: execução de contrato ou procedimentos
          preliminares (art. 7º, V, LGPD), cumprimento de obrigação legal
          (art. 7º, II) e legítimo interesse para segurança da plataforma
          (art. 7º, IX), sempre com equilíbrio em relação aos seus direitos.
        </p>
      </LegalSection>

      <LegalSection title="3. Com quem compartilhamos">
        <p>
          Operadores necessários ao serviço: Google Firebase (hospedagem de
          dados), Mercado Pago (pagamento) e Resend (envio de e-mail).
          Instituições parceiras não recebem seu CPF/CNPJ automaticamente.
          Autoridades públicas somente mediante obrigação legal.
        </p>
      </LegalSection>

      <LegalSection title="4. Conservação">
        <p>
          Pedidos, ingressos e doações são mantidos pelo tempo necessário à
          operação do evento, à comprovação financeira e aos prazos legais
          (inclusive fiscais e de defesa em eventuais disputas). Depois,
          os dados são eliminados ou anonimizados quando possível.
        </p>
      </LegalSection>

      <LegalSection title="5. Seus direitos">
        <p>
          Nos termos do art. 18 da LGPD, você pode solicitar confirmação de
          tratamento, acesso, correção, anonimização, portabilidade,
          informação sobre compartilhamentos e revogação de consentimento,
          quando essa for a base utilizada. Escreva para{' '}
          {ORG.emailOperacional}. Também é possível recorrer à Autoridade
          Nacional de Proteção de Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies e segurança">
        <p>
          Usamos armazenamento local do navegador apenas para concluir o
          checkout (por exemplo, o token da compra na sessão). Não utilizamos
          redes de anúncios de terceiros neste site. Adotamos HTTPS, regras
          de acesso no banco de dados e tokens opacos para recibos.
        </p>
      </LegalSection>

      <LegalSection title="7. Crianças e atualizações">
        <p>
          O site não se destina a cadastro de menores de 16 anos sem
          assistência. Esta política pode ser atualizada; a versão vigente é
          a desta página. O{' '}
          <Link
            to={ROUTES.PUBLIC.TERMS}
            className="font-bold text-brand underline"
          >
            Termo de Uso
          </Link>{' '}
          complementa estas regras.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
