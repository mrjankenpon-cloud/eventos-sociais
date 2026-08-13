import { Link } from 'react-router-dom';
import { LegalPage, LegalSection } from '../../components/public/LegalPage';
import { ORG, orgAddressLine } from '../../lib/orgInfo';
import { ROUTES } from '../../config';

export default function Terms() {
  return (
    <LegalPage
      title="Termo de Uso"
      subtitle="Condições para navegar no site, adquirir ingressos e fazer doações."
    >
      <p>
        Ao acessar {ORG.site} você concorda com este Termo. O site é operado
        pela {ORG.razaoSocial}, CNPJ {ORG.cnpj}, com sede em {orgAddressLine()}.
      </p>

      <LegalSection title="1. Objeto">
        <p>
          A plataforma divulga eventos, processa inscrições e pagamentos de
          ingressos, e recebe doações voluntárias em favor da entidade. Não se
          trata de marketplace de terceiros nem de instituição financeira.
        </p>
      </LegalSection>

      <LegalSection title="2. Ingressos e eventos">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            A inscrição exige dados verdadeiros (nome, CPF, e-mail e telefone)
            para emissão do ingresso e check-in.
          </li>
          <li>
            O QR Code é pessoal e intransferível, salvo indicação em contrário
            no evento. Cada código libera uma entrada.
          </li>
          <li>
            Datas, horários, tipos de ingresso e vagas seguem o cadastro do
            evento. Encerrada a venda ou esgotadas as vagas, novas compras não
            são aceitas.
          </li>
          <li>
            Cancelamentos, reembolsos e alterações observam a política do
            evento, o Código de Defesa do Consumidor quando aplicável e as
            regras do meio de pagamento (Mercado Pago).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Doações">
        <p>
          Doações são liberalidades: não geram ingresso, contraprestação ou
          direito a produto. O valor é livre, a partir do mínimo indicado na
          página de doações. Após a confirmação do pagamento, emitimos um
          certificado/recibo de doação, de caráter comprobatório e de
          agradecimento — não substitui declaração fiscal nem garante
          dedutibilidade no imposto de renda.
        </p>
      </LegalSection>

      <LegalSection title="4. Pagamentos">
        <p>
          Cobranças online são processadas pelo Mercado Pago. O DELPHOS não
          armazena número completo de cartão. Estornos, chargebacks e prazos
          seguem o provedor e a legislação brasileira.
        </p>
      </LegalSection>

      <LegalSection title="5. Conduta">
        <p>
          É vedado usar o site para fraude, falsidade ideológica, revenda
          não autorizada de ingressos, tentativa de burlar estoque ou qualquer
          uso ilícito. Podemos recusar ou cancelar operações em caso de
          indício de irregularidade.
        </p>
      </LegalSection>

      <LegalSection title="6. Propriedade intelectual">
        <p>
          Marca, logotipo, textos e layout do Instituto Delphos pertencem à
          entidade ou a licenciantes. Instituições parceiras mantêm direitos
          sobre seus próprios símbolos, exibidos com autorização cadastral.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitação">
        <p>
          O site é oferecido “como está”. Interrupções de internet, do
          provedor de pagamento ou de hospedagem podem ocorrer. Na medida
          permitida em lei, a responsabilidade limita-se ao valor efetivamente
          pago na operação questionada.
        </p>
      </LegalSection>

      <LegalSection title="8. Privacidade e alterações">
        <p>
          O tratamento de dados pessoais está na{' '}
          <Link
            to={ROUTES.PUBLIC.PRIVACY}
            className="font-bold text-brand underline"
          >
            Política de Privacidade
          </Link>
          . Este Termo pode ser atualizado; a versão vigente é a publicada
          nesta página, com efeito a partir da divulgação.
        </p>
      </LegalSection>

      <LegalSection title="9. Foro">
        <p>
          Aplica-se a legislação da República Federativa do Brasil. Fica
          eleito o foro da comarca de Barueri/SP, com ressalva do foro do
          domicílio do consumidor quando a lei assim determinar.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
