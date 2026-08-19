import { ACCESS_APPROVER_EMAIL } from '../../../config/access';
import { DocCallout, DocH2, DocH3, DocP, DocTable, DocUl } from './DocBits';

export function ReportDoc() {
  return (
    <article className="max-w-3xl">
      <p className="text-base text-gray-800 font-semibold leading-relaxed mb-4">
        Relatório das peças que fazem o site DELPHOS funcionar. Linguagem
        direta: o que é cada ferramenta, onde ela atua e o que acontece se
        falhar. Destinado a quem administra a operação, sem jargão
        desnecessário.
      </p>

      <DocH2 id="visao">Visão geral</DocH2>
      <DocP>
        O DELPHOS é um site público de eventos e doações, mais um painel
        restrito para a equipe. O visitante compra ingresso ou doa; a equipe
        cadastra eventos, confere pagamentos e faz check-in. Nenhuma dessas
        etapas vive “só no computador de alguém”: os dados ficam na nuvem, com
        cópia nas empresas listadas abaixo.
      </DocP>
      <DocP>
        Endereço público usual: <strong>institutodelphos.com.br</strong>. Há
        também o endereço técnico na Vercel. O painel fica em{' '}
        <strong>/controle</strong>.
      </DocP>

      <DocH2 id="mapa">Mapa das integrações</DocH2>
      <DocTable
        headers={['Ferramenta', 'Papel em uma frase', 'O que o público percebe', 'O que a equipe percebe']}
        rows={[
          [
            'Vercel',
            'Publica o site na internet (páginas, imagens do programa, HTTPS).',
            'Abre o site rápido, cadeado de segurança no navegador.',
            'Cada atualização do programa, quando enviada, aparece no ar depois do deploy.',
          ],
          [
            'Firebase Authentication (Google)',
            'Identifica quem é a pessoa da equipe pelo Gmail.',
            'Não usa isso para comprar ingresso (compra é sem login).',
            'Botão “Entrar com Gmail”. Pedidos sem permissão avisam ' +
              ACCESS_APPROVER_EMAIL +
              '.',
          ],
          [
            'Cloud Firestore (Firebase)',
            'Banco de dados: eventos, pedidos, ingressos, textos, permissões, doações.',
            'Vê eventos e conteúdos gravados aqui.',
            'Tudo que se salva no painel (e as regras de quem pode ler/escrever).',
          ],
          [
            'Firebase Storage / banco de imagens',
            'Guarda fotos (capa, logos, galeria). Se o Storage não estiver ativo, o sistema usa a coleção de imagens no próprio Firestore.',
            'Fotos nas páginas.',
            'Upload no cadastro de evento, patrocinador, instituição e editor de texto.',
          ],
          [
            'Cloud Functions (Firebase)',
            'Programas que rodam no servidor: pagamento, e-mail, webhook, reembolso, pedido de acesso, avisos push.',
            'Checkout, QR PIX, e-mail de ingresso, certificado de doação.',
            'Reembolso, upgrade meia→inteira, expirar reserva, notificar app.',
          ],
          [
            'Mercado Pago',
            'Recebe o dinheiro (PIX no site; cartão no checkout do Mercado Pago).',
            'Paga com PIX ou cartão (crédito; débito Elo quando disponível).',
            'Confirmação automática, taxas na conciliação, reembolso pela API.',
          ],
          [
            'Resend',
            'Envia e-mails (ingressos, recuperação da compra, certificado de doação, pedido de acesso ao painel).',
            'Recebe mensagem no e-mail informado na compra ou doação.',
            'Se a chave não estiver configurada, a compra não quebra; o envio fica pendente nos registros.',
          ],
          [
            'Web Push + App (PWA)',
            'Permite “Instalar App Delphos” e avisos no celular.',
            'Pode instalar o site como aplicativo e receber aviso de evento novo.',
            'Dashboard mostra instalações e avisos ativos; interruptor no evento dispara o aviso.',
          ],
          [
            'Google Maps (somente link)',
            'Não é um mapa embutido complexo: é um atalho com o endereço do evento.',
            'Clique para abrir o mapa no celular.',
            'Interruptor “Exibir mapa” no evento.',
          ],
          [
            'YouTube',
            'Hospeda os vídeos; o site só embute o player.',
            'Carrossel de vídeos na home.',
            'Aba Vídeos: cola o link e ativa.',
          ],
        ]}
      />

      <DocH2 id="visitante">Caminho do visitante (o que cada peça faz)</DocH2>
      <DocH3>Ver o instituto e os eventos</DocH3>
      <DocP>
        A home, o Sobre, os termos e a lista de eventos saem do Firestore
        (textos da aba Conteúdo + cadastro de Eventos). Imagens vêm do
        armazenamento de arquivos. Vídeos vêm do YouTube. O rodapé e o visual
        são do próprio site na Vercel.
      </DocP>
      <DocH3>Comprar ingresso</DocH3>
      <DocOlVisitante />
      <DocH3>Doar</DocH3>
      <DocP>
        Na página Doações, a pessoa escolhe valor (mínimo definido pelo
        sistema, hoje R$ 10 no fluxo de doação) e paga PIX ou cartão, no mesmo
        Mercado Pago. Após confirmação, pode receber certificado por e-mail
        (Resend).
      </DocP>
      <DocH3>Recuperar ingresso</DocH3>
      <DocP>
        “Já comprou? Receber ingressos” pede o e-mail e envia um link
        temporário. Não lista compras de outros e-mails. Isso usa Function +
        Resend + tokens guardados no Firestore.
      </DocP>

      <DocH2 id="admin-flow">Caminho da equipe (o que cada peça faz)</DocH2>
      <DocUl>
        <li>
          <strong>Login</strong> — só Google/Gmail. Firebase Auth. Sem senha
          local do antigo usuário operacional.
        </li>
        <li>
          <strong>Gravar evento</strong> — Firestore. Preço e estoque passam a
          valer no checkout na Function, não no navegador do comprador.
        </li>
        <li>
          <strong>Aviso de evento novo</strong> — Function de notificação +
          chaves Web Push. Entrega no celular de quem autorizou.
        </li>
        <li>
          <strong>Check-in</strong> — leitura do QR gravado no ingresso
          (Firestore). Upgrade meia usa PIX Mercado Pago e atualiza o mesmo
          código.
        </li>
        <li>
          <strong>Reembolso</strong> — Function fala com o Mercado Pago e
          marca pedido/ticket no banco.
        </li>
        <li>
          <strong>Pedido de acesso</strong> — Function grava a solicitação e
          e-mail Resend para {ACCESS_APPROVER_EMAIL}.
        </li>
      </DocUl>

      <DocH2 id="pagamento">Pagamento — detalhe objetivo</DocH2>
      <DocTable
        headers={['Meio', 'Como o visitante paga', 'Como o sistema confirma']}
        rows={[
          [
            'PIX',
            'QR e código copia-e-cola na própria página Delphos.',
            'Mercado Pago avisa a Function (webhook). O pedido muda para confirmado e os ingressos são emitidos.',
          ],
          [
            'Cartão',
            'A pessoa é levada ao Checkout Pro do Mercado Pago e volta ao site.',
            'O mesmo webhook (e a página de obrigado) alinham o status. Ingressos na tela de sucesso e no e-mail.',
          ],
          [
            'Cortesia / R$ 0',
            'Não há cobrança.',
            'A Function emite o ingresso na hora, sem Mercado Pago.',
          ],
        ]}
      />
      <DocP>
        Reserva de estoque: enquanto o PIX ou o cartão não concluem, as vagas
        ficam reservadas por um tempo e podem expirar (rotina no servidor).
        Assim duas pessoas não compram a última vaga ao mesmo tempo.
      </DocP>
      <DocP>
        Cartões: crédito das bandeiras habilitadas na conta Mercado Pago;
        débito no fluxo atual está alinhado à bandeira Elo, conforme a
        conta. Parcelamento segue as regras gravadas no checkout (até o máximo
        configurado no Mercado Pago / no código do checkout).
      </DocP>

      <DocH2 id="functions">Funções no servidor (nomes úteis para suporte)</DocH2>
      <DocP>
        Não é preciso decorar. Serve para falar com quem presta suporte
        técnico.
      </DocP>
      <DocTable
        headers={['Função', 'Faz o quê']}
        rows={[
          ['createCheckoutSession', 'Abre compra de ingresso (PIX ou cartão).'],
          ['createDonationSession', 'Abre doação.'],
          ['mpWebhook', 'Recebe “o pagamento mudou” do Mercado Pago.'],
          ['getOrderReceipt', 'Mostra recibo e ingressos com o código secreto da compra.'],
          ['requestGuestTicketsEmail / getGuestTickets', 'Recupera ingressos por e-mail.'],
          ['refundPayment', 'Estorno (admin).'],
          ['createTicketUpgradeSession', 'PIX da diferença meia → inteira.'],
          ['expirePendingOrders', 'Solta vaga de pedido parado.'],
          ['sendEventNotification', 'Aviso no app.'],
          ['requestPanelAccess', 'Pedido de Gmail para o painel.'],
          ['syncUserClaims', 'Ajusta o “crachá” interno de perfil após o login.'],
        ]}
      />

      <DocH2 id="seguranca">Segurança e privacidade (resumo)</DocH2>
      <DocUl>
        <li>
          Chaves secretas de pagamento e e-mail ficam no servidor (Functions),
          não no aplicativo que o visitante baixa.
        </li>
        <li>
          O painel não usa senha própria: só Gmail autorizado.
        </li>
        <li>
          Regras do Firestore impedem o público de inventar pedido ou
          ingresso. Check-in e financeiro passam pelo servidor ou por perfil
          com permissão.
        </li>
        <li>
          Textos de Privacidade e Termos, na aba Conteúdo, são o contrato
          visível ao titular dos dados; mantenha-os alinhados à operação real.
        </li>
      </DocUl>

      <DocH2 id="falhas">Se uma ferramenta parar</DocH2>
      <DocTable
        headers={['Se falhar…', 'Efeito prático', 'O que a equipe pode fazer']}
        rows={[
          [
            'Vercel / site fora do ar',
            'Ninguém abre o site nem o painel por aquele endereço.',
            'Checar status da Vercel e o último deploy.',
          ],
          [
            'Firestore',
            'Listas vazias, não salva evento, checkout recusa.',
            'Checar console Firebase e a página interna de diagnóstico (/controle/health), se disponível.',
          ],
          [
            'Functions',
            'Não gera PIX, não confirma pagamento, não manda e-mail.',
            'Checar deploy das functions e os registros (logs) no Firebase.',
          ],
          [
            'Mercado Pago',
            'PIX ou cartão recusados; webhook parado.',
            'Painel Mercado Pago (aplicação, webhook, saldo, PIX habilitado).',
          ],
          [
            'Resend',
            'Compra pode até concluir, mas o e-mail não chega.',
            'Pedir para a pessoa usar “Receber ingressos” de novo; conferir a chave e o domínio do remetente.',
          ],
          [
            'Google Auth',
            'Equipe não entra no painel.',
            'Provedor Google ativo; domínio do site autorizado; Gmail cadastrado em Permissões.',
          ],
        ]}
      />

      <DocCallout title="O que este relatório não é">
        <p>
          Não substitui contratos com Vercel, Google, Mercado Pago ou Resend,
          nem o extrato bancário. É o mapa da integração do DELPHOS para a
          operação do Instituto.
        </p>
      </DocCallout>
    </article>
  );
}

function DocOlVisitante() {
  return (
    <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600 leading-relaxed mb-4">
      <li>Abre o evento (dados no Firestore, fotos no armazenamento).</li>
      <li>Escolhe tipos e quantidade (limites e preços do cadastro).</li>
      <li>
        Informa nome, CPF, e-mail, telefone — gravados no pedido para o
        ingresso e o e-mail.
      </li>
      <li>
        PIX: a Function pede o QR ao Mercado Pago. Cartão: a Function cria a
        sessão e redireciona.
      </li>
      <li>
        O Mercado Pago avisa a Function. Ingressos (código e QR) nascem no
        Firestore. Resend envia o e-mail. A tela de sucesso mostra os passes.
      </li>
    </ol>
  );
}
