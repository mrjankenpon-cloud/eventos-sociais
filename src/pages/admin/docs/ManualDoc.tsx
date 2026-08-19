import {
  DocCallout,
  DocH2,
  DocH3,
  DocOl,
  DocP,
  DocTable,
  DocUl,
} from './DocBits';

export const MANUAL_NAV = [
  { id: 'entrar', label: '1. Entrar no painel' },
  { id: 'abas', label: '2. Cada aba do menu' },
  { id: 'preparar', label: '3. Preparar o site' },
  { id: 'criar', label: '4. Criar um evento' },
  { id: 'monitorar', label: '5. Monitorar o evento' },
  { id: 'dia', label: '6. No dia do evento' },
  { id: 'auditar', label: '7. Auditar e exportar' },
  { id: 'encerrar', label: '8. Encerrar ou excluir' },
  { id: 'ajuda', label: '9. Se algo der errado' },
] as const;

export function ManualDoc() {
  return (
    <article className="max-w-3xl">
      <p className="text-base text-gray-800 font-semibold leading-relaxed mb-4">
        Este manual ensina a usar o painel DELPHOS do começo ao fim, como se
        alguém estivesse ao seu lado. Não é preciso saber programar. Cada tela
        tem um propósito; abaixo está o que ela faz e como mudar o que aparece
        no site.
      </p>

      <DocH2 id="entrar">1. Entrar no painel</DocH2>
      <DocP>
        O endereço do controle é o do site, com <strong>/controle</strong> no
        final (por exemplo, institutodelphos.com.br/controle). Só entra quem
        tem um Gmail autorizado.
      </DocP>
      <DocOl>
        <li>Abra a página de login da Área Administrativa.</li>
        <li>
          Clique em <strong>Entrar com Gmail</strong> e escolha a conta Google
          (@gmail.com).
        </li>
        <li>
          Se o e-mail já estiver em Permissões, você cai no Dashboard.
        </li>
        <li>
          Se ainda não tiver permissão, o sistema <strong>não abre o painel</strong>.
          Ele envia um pedido para o administrador{' '}
          <strong>augustovogel82@gmail.com</strong> validar. Depois da
          aprovação, entre de novo com o mesmo Gmail.
        </li>
      </DocOl>
      <DocCallout title="Sair com segurança">
        <p>
          No rodapé do menu esquerdo, use <strong>Sair</strong>. Isso encerra
          sua sessão neste computador. Use também <strong>Ver site público</strong>{' '}
          para conferir o que o visitante vê, sem sair da conta.
        </p>
      </DocCallout>
      <DocH3>Perfis de acesso (o que cada pessoa pode fazer)</DocH3>
      <DocTable
        headers={['Perfil', 'Para que serve']}
        rows={[
          [
            'Administrador (e Master)',
            'Tudo: eventos, dinheiro, reembolsos, permissões, conteúdo do site e aprovação de novos acessos.',
          ],
          [
            'Editor',
            'Monta e publica conteúdo e eventos. Não deve tratar reembolso nem permissões de outros.',
          ],
          [
            'Operador',
            'Dia do evento: check-in, lista de inscritos, conferência na porta.',
          ],
          [
            'Visitante (viewer)',
            'Só consulta. Não altera cadastros nem pagamentos.',
          ],
        ]}
      />

      <DocH2 id="abas">2. Para que serve cada aba do menu</DocH2>
      <DocP>
        O menu à esquerda é o mapa do painel. No celular, abra pelo ícone de
        três traços. A aba ativa fica destacada em azul.
      </DocP>
      <DocTable
        headers={['Aba', 'O que você resolve ali', 'Como alterar']}
        rows={[
          [
            'Dashboard',
            'Visão geral: eventos, vendas, check-ins, arrecadação e quantos celulares instalaram o app.',
            'Clique nos cartões para filtrar. Escolha um evento na lista para ver só aquele. Não “grava” configuração — é só consulta e atalho.',
          ],
          [
            'Painel',
            'Frequência de visitas no site e quanto o banco Firebase já usou da faixa gratuita do dia (leituras, escritas, exclusões). Avisa se está tranquilo, em atenção ou perto de cobrança extra no plano pago.',
            'Abra a aba e leia o cartão colorido. “Atualizar agora” puxa as métricas oficiais na hora; o resto entra sozinho a cada 5 minutos.',
          ],
          [
            'Eventos',
            'Lista todos os eventos. Daqui você cria, edita, abre check-in, abre relatório ou arquiva/exclui.',
            'Botão Novo Evento; ícones em cada linha; filtros Publicado / Encerrado; busca pelo nome.',
          ],
          [
            'Doações',
            'Doações avulsas feitas no site (não são ingresso de um evento).',
            'Busca, filtro de status, exportar CSV, abrir o detalhe da doação.',
          ],
          [
            'Patrocinadores',
            'Cadastro de empresas apoiadoras (nome, logo, site). É a “prateleira” para vincular depois no evento.',
            'Novo, editar, ativar/desativar. Desativado some das escolhas novas e pode sumir do site se o evento só mostra ativos.',
          ],
          [
            'Instituições',
            'Cadastro de instituições beneficiadas (nome, logo, cidade).',
            'Igual aos patrocinadores: criar, editar, ativar ou desativar.',
          ],
          [
            'Vídeos',
            'Filmes da home (YouTube). Ordem e “ativo” controlam o carrossel público.',
            'Cole o link do YouTube, título, ative e arraste a ordem se a tela permitir reordenar.',
          ],
          [
            'Conteúdo',
            'Textos das páginas Sobre, Saiba mais, Termos, Privacidade e texto da página de Doações.',
            'Escolha a subaba, edite o título e o texto, clique em Salvar. Restaurar volta o texto padrão daquela página.',
          ],
          [
            'Permissões',
            'Quem entra no painel, com qual perfil, e pedidos de Gmail aguardando validação.',
            'Nova permissão (nome + Gmail + perfil). Aprovar ou recusar pedidos. Desativar ou remover alguém (não o Master).',
          ],
          [
            'Documentação',
            'Este manual e o relatório das ferramentas do site.',
            'Só leitura. Use as abas Manual / Relatório no topo desta página.',
          ],
        ]}
      />

      <DocH2 id="preparar">3. Preparar o site (antes de vender ingresso)</DocH2>
      <DocP>
        Vale deixar a “casa arrumada” antes de publicar um evento: textos
        legais, logos e quem pode operar o painel.
      </DocP>
      <DocH3>3.1 Conteúdo das páginas públicas</DocH3>
      <DocOl>
        <li>Abra <strong>Conteúdo</strong>.</li>
        <li>
          Use as fichas no topo: <strong>Sobre</strong>, <strong>Saiba mais</strong>,{' '}
          <strong>Termo de Uso</strong>, <strong>Privacidade</strong>,{' '}
          <strong>Doações</strong>.
        </li>
        <li>
          O título aparece no topo da página pública. O texto grande é o corpo
          (você pode colocar negrito, listas e imagens pelo editor).
        </li>
        <li>
          <strong>Salvar</strong> publica na hora no site. Se sair da página
          sem salvar, o navegador pode avisar que há alteração não gravada.
        </li>
        <li>
          <strong>Restaurar padrão</strong> desfaz o texto da ficha atual para
          o modelo original do sistema — use só se tiver certeza.
        </li>
        <li>
          O ícone de olho abre a página pública para você conferir.
        </li>
      </DocOl>
      <DocH3>3.2 Patrocinadores e instituições</DocH3>
      <DocOl>
        <li>
          Em <strong>Patrocinadores</strong> / <strong>Instituições</strong>,
          clique para cadastrar nome e logo.
        </li>
        <li>
          Deixe <strong>Ativo</strong> ligado para poder escolher no evento.
        </li>
        <li>
          No evento (passo 4), você <em>vincula</em> quais logos entram naquela
          festa. Cadastrar aqui não coloca sozinho na página do evento.
        </li>
      </DocOl>
      <DocH3>3.3 Vídeos da home</DocH3>
      <DocOl>
        <li>Abra <strong>Vídeos</strong>.</li>
        <li>Informe título e o link do YouTube (o site extrai o vídeo).</li>
        <li>Marque como ativo para aparecer no carrossel da página inicial.</li>
        <li>Vídeos inativos ficam guardados, mas o público não vê.</li>
      </DocOl>
      <DocH3>3.4 Permissões da equipe</DocH3>
      <DocOl>
        <li>Abra <strong>Permissões</strong>.</li>
        <li>
          Em pedidos pendentes, <strong>Aprovar admin</strong> libera o Gmail
          como administrador, ou <strong>Recusar</strong> barra o pedido.
        </li>
        <li>
          <strong>Nova permissão</strong>: nome completo, Gmail, perfil
          (Administrador, Editor, Operador ou Visitante). A pessoa entra só
          com Gmail, sem senha do sistema.
        </li>
        <li>
          <strong>Desativar</strong> impede o próximo login, sem apagar o
          histórico. <strong>Remover</strong> tira a permissão. O administrador
          Master não pode ser desativado nem removido por aqui.
        </li>
      </DocOl>

      <DocH2 id="criar">4. Criar um evento, configuração por configuração</DocH2>
      <DocOl>
        <li>
          Vá em <strong>Eventos</strong> → <strong>Novo Evento</strong>.
        </li>
        <li>
          Preencha as fichas na ordem abaixo. Sempre termine em{' '}
          <strong>Salvar</strong> no rodapé. Sem salvar, nada vai para o site.
        </li>
      </DocOl>

      <DocH3>Ficha Informações Gerais</DocH3>
      <DocTable
        headers={['Campo', 'Para que serve', 'Como preencher / alterar']}
        rows={[
          [
            'Nome do evento',
            'Título que o público lê no site e no ingresso.',
            'Texto curto e claro. Obrigatório.',
          ],
          [
            'Categoria',
            'Ajuda a classificar o tipo de encontro.',
            'Escolha na lista.',
          ],
          [
            'Data, início e fim',
            'Dia e horário do encontro. O site e o ingresso usam isso.',
            'Use o calendário e os horários. Data e início são obrigatórios.',
          ],
          [
            'Local, endereço, cidade, CEP',
            'Onde a pessoa deve ir. O endereço alimenta o mapa, se você ligar o mapa nas Configurações.',
            'Local = nome do espaço. Endereço = rua e número. CEP aceita máscara.',
          ],
          [
            'Descrição resumida',
            'Chamada curta na listagem e nos cartões.',
            'Obrigatória. Duas ou três frases.',
          ],
          [
            'Descrição completa',
            'Texto longo da página do evento (programação, regras, o que levar).',
            'Editor de texto. Pode incluir imagens.',
          ],
          [
            'Vagas do salão',
            'Capacidade geral do evento (controle interno e, se ligado, vagas visíveis).',
            'Número. Combine com os tipos de ingresso para não vender além do espaço.',
          ],
          [
            'Texto do botão',
            'Palavra do botão de compra na página pública (ex.: Inscreva-se).',
            'Altere se quiser outro verbo.',
          ],
          [
            'Link de pagamento externo',
            'Só se a venda NÃO for pelo Mercado Pago do site. Quase sempre deixe vazio.',
            'URL completa. O fluxo normal Delphos não precisa deste campo.',
          ],
        ]}
      />

      <DocH3>Ficha Ingressos</DocH3>
      <DocP>
        Aqui você define o que a pessoa pode comprar. O valor cobrado no
        cartão ou no PIX é o que está gravado nesta ficha — o site não aceita
        o comprador “chutar” outro preço.
      </DocP>
      <DocUl>
        <li>
          <strong>Inteira</strong> — entrada normal. Ative, ponha preço (em
          reais) e quantidade à venda.
        </li>
        <li>
          <strong>Meia-entrada</strong> — preço reduzido. A comprovação do
          direito é na porta. Pode converter para inteira no check-in se a
          pessoa não comprovar (gera PIX da diferença).
        </li>
        <li>
          <strong>Retirada</strong> — kit, alimento ou produto, não é
          necessariamente acesso à festa. No check-in o operador marca
          retirada, não “entrada”.
        </li>
        <li>
          Você pode <strong>adicionar tipo extra</strong> (nome, descrição,
          preço, quantidade, se compete pelas vagas do salão).
        </li>
        <li>
          Tipo <strong>inativo</strong> não aparece na compra. Quantidade 0
          esgota aquele tipo.
        </li>
      </DocUl>
      <DocCallout title="Gratuito">
        <p>
          Se o valor do tipo for zero, o sistema emite o ingresso sem passar
          pelo Mercado Pago, desde que a compra online esteja permitida.
        </p>
      </DocCallout>

      <DocH3>Ficha Galeria</DocH3>
      <DocP>
        Envie a <strong>capa</strong> (primeira imagem, a mais importante) e
        fotos extras. Sem imagem, a página fica pobre. Nas Configurações você
        liga ou desliga se a galeria aparece para o público.
      </DocP>

      <DocH3>Fichas Patrocinadores e Instituições (dentro do evento)</DocH3>
      <DocOl>
        <li>Ligue “Exibir…” se quiser a seção na página do evento.</li>
        <li>Marque na lista quem entra neste evento (já cadastrados nas abas do menu).</li>
        <li>Arraste para mudar a ordem dos logos.</li>
      </DocOl>

      <DocH3>Ficha Configurações (comportamento no site)</DocH3>
      <DocTable
        headers={['Interruptor', 'Ligado', 'Desligado']}
        rows={[
          [
            'Evento publicado',
            'Aparece no site para o público.',
            'Rascunho: só quem tem painel vê na lista (como encerrado/não publicado).',
          ],
          [
            'Enviar notificação',
            'Ao salvar, avisa no celular de quem instalou o App Delphos e aceitou avisos. Precisa estar publicado.',
            'Não dispara aviso. Se já enviou uma vez, para reenviar: desligue, salve, ligue e salve de novo.',
          ],
          [
            'Evento em destaque',
            'Entra nos banners principais da home.',
            'Só na listagem comum de eventos.',
          ],
          [
            'Permitir compra online',
            'Mostra inscrição e pagamento (PIX no site ou cartão no Mercado Pago).',
            'Página informativa, sem checkout.',
          ],
          [
            'Permitir retirada gratuita',
            'Habilita a modalidade retirada (kits etc.).',
            'Tipos de retirada não entram no fluxo.',
          ],
          [
            'Exibir mapa',
            'Mostra atalho para o Google Maps com o endereço.',
            'Sem mapa.',
          ],
          [
            'Exibir galeria / patrocinadores / instituições',
            'Mostra cada bloco na página pública.',
            'O conteúdo pode existir no cadastro, mas o visitante não vê o bloco.',
          ],
          [
            'Exibir quantidade disponível',
            'O público vê quantas vagas/ingressos restam.',
            'Não mostra estoque (útil se você não quiser pressão de “últimas vagas”).',
          ],
        ]}
      />
      <DocP>
        <strong>Ingressos por compra</strong> limita quantos um CPF pode levar
        na mesma transação (padrão 10). Altere se a regra da casa for outra.
      </DocP>
      <DocP>
        Depois de salvar um evento <strong>publicado</strong> com compra
        online, teste no site público: abra o evento, vá até a inscrição e
        confira preços e imagens. Use uma compra real pequena ou o fluxo de
        cortesia se o tipo for R$ 0.
      </DocP>

      <DocH2 id="monitorar">5. Monitorar o evento (antes e durante as vendas)</DocH2>
      <DocH3>Na lista Eventos</DocH3>
      <DocUl>
        <li>
          Status <strong>Publicado</strong> — no ar. <strong>Encerrado</strong>{' '}
          — não publicado. <strong>Arquivado</strong> — saiu do site, dados
          podem continuar no painel.
        </li>
        <li>A lupa filtra pelo nome.</li>
        <li>Clique na linha ou no lápis para editar (mesmas fichas da criação).</li>
      </DocUl>
      <DocH3>No Dashboard</DocH3>
      <DocOl>
        <li>
          Cartões mostram totais: eventos no ar, ingressos, check-ins,
          arrecadação, apps instalados.
        </li>
        <li>
          Troque a visão para um evento específico e veja só os números dele.
        </li>
        <li>
          Relatórios rápidos: vendidos, pagantes, check-in, arrecadação,
          aplicativos e avisos. São listas para conferência, não substituem o
          relatório completo do evento.
        </li>
      </DocOl>
      <DocH3>Doações (fora do ingresso)</DocH3>
      <DocP>
        Quem doa pela página Doações aparece em <strong>Doações</strong>.
        Status confirmado significa que o pagamento foi reconhecido. Você pode
        exportar CSV e abrir o detalhe (valores, documento, certificado quando
        houver).
      </DocP>

      <DocH2 id="dia">6. Utilizar os recursos no dia do evento</DocH2>
      <DocH3>Check-in (porta ou retirada)</DocH3>
      <DocOl>
        <li>
          Em Eventos, clique no ícone verde de check (ou abra o evento e siga
          para check-in).
        </li>
        <li>
          <strong>Ler QR</strong>: a câmera lê o código do celular ou do papel.
          Confirme a pessoa e o tipo de ingresso. Meia convertida em inteira
          mostra a observação correspondente.
        </li>
        <li>
          Sem câmera: busque pelo nome, e-mail ou código e confirme na lista.
        </li>
        <li>
          Ingresso de <strong>retirada</strong> marca entrega do kit, não
          entrada na festa (a menos que a organização use assim).
        </li>
        <li>
          Se marcou errado, use a opção de desfazer o check-in daquele ticket
          (com confirmação).
        </li>
        <li>
          <strong>Meia → inteira</strong>: gera um PIX da diferença. Quando o
          pagamento confirmar, o mesmo QR vira inteira; não se emite um
          segundo ingresso.
        </li>
      </DocOl>
      <DocH3>Detalhe da compra</DocH3>
      <DocP>
        Do relatório de inscritos ou do Dashboard, abra uma compra. Ali você
        vê dados do comprador, status, ingressos e, se for administrador,
        <strong> reembolso</strong> (total ou de um ticket) e o mesmo upgrade
        de meia. Reembolso devolve o dinheiro pelo Mercado Pago e cancela o
        ticket correspondente. Só use com certeza — o movimento é real na
        conta.
      </DocP>
      <DocH3>Lista de inscritos (relatório do evento)</DocH3>
      <DocP>
        Ícone de documento na linha do evento. Mostra quem pagou, quem está
        pendente, check-in, meia convertida. Dá para marcar presença pela
        lista, buscar e <strong>baixar CSV</strong> para Excel.
      </DocP>

      <DocH2 id="auditar">7. Auditar o evento</DocH2>
      <DocOl>
        <li>
          Abra o <strong>relatório do evento</strong> (ícone de documento).
        </li>
        <li>
          Confira totais: vendidos, pagos, pendentes, check-ins, valores.
        </li>
        <li>
          Cruze com o <strong>Dashboard</strong> (arrecadação e pagantes).
        </li>
        <li>
          Exporte CSV (participantes e pedidos) para arquivo da loja, da
          contabilidade ou da ata.
        </li>
        <li>
          Em cada compra confirmada, veja se o status do Mercado Pago
          bate com o painel (aprovado, reembolsado, pendente).
        </li>
        <li>
          Doações avulsas auditam-se na aba Doações, não misturadas com
          ingresso, a menos que você some os dois CSV à parte.
        </li>
      </DocOl>
      <DocCallout title="O que o sistema já trava para você">
        <p>
          Preço e estoque saem do cadastro do evento, não do navegador do
          comprador. Pedido só vira ingresso depois do pagamento reconhecido
          (ou se for gratuito). Isso reduz erro de “paguei um valor e o
          sistema gravou outro”.
        </p>
      </DocCallout>

      <DocH2 id="encerrar">8. Finalizar ou excluir o evento</DocH2>
      <DocP>
        Quando a festa acabou, você tem três destinos. O botão vermelho de
        lixeira em Eventos abre a pergunta{' '}
        <strong>“O que fazer com o relatório?”</strong>
      </DocP>
      <DocTable
        headers={['Opção', 'O que acontece', 'Quando usar']}
        rows={[
          [
            'Manter relatório no sistema',
            'O evento some do site público (arquivado). Pedidos, ingressos e números continuam no painel para consulta.',
            'Encerramento normal. Você ainda pode auditar depois.',
          ],
          [
            'Exportar CSV e manter',
            'Baixa a planilha e depois arquiva como na opção acima.',
            'Quando a tesouraria ou a secretaria precisa do arquivo e você ainda quer o histórico no sistema.',
          ],
          [
            'Apagar relatório do banco',
            'Remove de vez evento, pedidos, ingressos e check-ins. Não dá para desfazer.',
            'Só em teste, duplicata ou exigência explícita de apagar dados. Confirme o aviso extra na tela.',
          ],
        ]}
      />
      <DocP>
        Para apenas “tirar do ar” sem arquivar: edite o evento, desligue{' '}
        <strong>Evento publicado</strong> e salve. Ele fica encerrado na
        lista, mas o cadastro permanece editável.
      </DocP>
      <DocP>
        Doações não são apagadas junto com o evento; elas vivem na aba
        Doações.
      </DocP>

      <DocH2 id="ajuda">9. Se algo der errado</DocH2>
      <DocUl>
        <li>
          <strong>Não entra no painel</strong> — confirme Gmail certo e se a
          permissão está ativa. Sem permissão, o pedido vai para
          augustovogel82@gmail.com.
        </li>
        <li>
          <strong>Evento não aparece no site</strong> — ligue Publicado, salve,
          atualize a página pública (às vezes o celular guarda cache; force
          atualizar).
        </li>
        <li>
          <strong>Não abre compra</strong> — Permitir compra online ligado;
          pelo menos um tipo de ingresso ativo com quantidade; evento
          publicado.
        </li>
        <li>
          <strong>Pagamento PIX/cartão</strong> — o visitante conclui no
          Mercado Pago (cartão) ou no QR (PIX). O painel atualiza quando a
          confirmação chega. Peça para a pessoa não fechar a tela cedo demais;
          o e-mail de ingressos também recupera a compra.
        </li>
        <li>
          <strong>QR não lê</strong> — use a busca por nome. Confira se o
          ingresso não está cancelado ou já usado.
        </li>
        <li>
          <strong>Aviso no celular não chegou</strong> — o público precisa ter
          instalado o App Delphos e aceitado avisos; o evento precisa estar
          publicado; o interruptor de notificação precisa ser salvo conforme o
          passo 4.
        </li>
      </DocUl>
    </article>
  );
}
