# Arquitetura final — Mercado Pago (Checkout Pro)

**Status:** implementação em código (ver `docs/mercado-pago-implementacao.md`)  
**Projeto Firebase:** `eventosociais-c057d` (confirmado em `.firebaserc`)  
**Functions:** pasta `functions/` com checkout, webhook, expire, receipt e refund.

**Decisões fechadas:** Checkout Pro · secrets só em Functions · preço congelado no pedido · reserva 15 min · soft-delete · cashout A (acompanhamento) · reembolso via API no admin · gratuito (R$ 0) sem MP · meia sem validação online · tipos genéricos por evento (não só inteira/meia/retirada).

---

## 1. Modelo de dados final

### Princípio
Uma única integração MP processa **qualquer** tipo de ingresso/produto do evento.  
`inteira` / `meia` / `retirada` são **defaults iniciais**, não hardcode do gateway.

### `eventos/{eventoId}`
Campos novos / relevantes:
| Campo | Tipo | Notas |
|--------|------|--------|
| `status` | `rascunho` \| `publicado` \| `arquivado` | soft-delete → `arquivado` |
| `arquivadoEm` | timestamp? | quando soft-deleted |
| `vendasEncerramEm` | timestamp? | encerramento manual/agendado |
| `limitePorCompra` | number | default evento (ex.: 10) |
| `permitirCompraOnline` | bool | já existe |
| ~~`linkPagamento`~~ | — | deprecar na UI (legado ok em docs antigos) |

Não apagar o documento ao “excluir”.

### `ingressos/{ingressoId}` (Tipo de Ingresso/Produto do Evento)
| Campo | Tipo | Notas |
|--------|------|--------|
| `id` | string | = doc id |
| `eventoId` | string | vínculo obrigatório |
| `key` | string | slug estável (`inteira`, `meia`, `retirada`, `vip`, `custom-…`) |
| `nome` | string | exibição |
| `descricao` | string | |
| `ativo` | bool | |
| `valor` | number | preço oficial (BRL); `0` = gratuito |
| `quantidade` | number | capacidade |
| `quantidadeVendida` | number | inclui reservados + pagos (ver §7) |
| `quantidadeDisponivel` | number | derivado |
| `limitePorCompra` | number? | sobrescreve limite do evento se definido |
| `natureza` | enum | `entrada` \| `retirada` \| `consumo` \| `cortesia` \| `outro` — **extensível**; defaults: inteira/meia→`entrada`, retirada→`retirada` |
| `exigeComprovacao` | bool | default `false`; futuro (meia na porta) — **não valida na compra** |
| `checkinModo` | enum | `entrada` \| `retirada` \| `nao_aplicavel` — prepara check-in futuro |

### `pedidos/{pedidoId}`
| Campo | Tipo | Notas |
|--------|------|--------|
| dados comprador | nome, cpf, telefone, email | formulário atual |
| `eventoId` | string | |
| `ingressoId` | string | |
| `ingressoKey` / `ingressoNome` | string | snapshot |
| `natureza` | string | snapshot do tipo |
| `quantidade` | number | |
| `valorUnitario` | number | **congelado** na criação |
| `valorTotal` | number | `valorUnitario * quantidade` (backend) |
| `status` | `pendente` \| `confirmado` \| `expirado` \| `cancelado` \| `reembolsado` | |
| `estoqueReservado` | bool | |
| `reservaExpiraEm` | timestamp | createdAt + 15 min |
| `formaPagamento` | `mercadopago` \| `gratuito` \| legado | |
| `mpPreferenceId` | string? | |
| `mpPaymentId` | string? | |
| `mpStatus` | string? | status bruto MP |
| `mpStatusDetail` | string? | |
| `mpTransactionAmount` | number? | bruto |
| `mpFeeAmount` | number? | taxas (da API MP) |
| `mpNetReceivedAmount` | number? | líquido |
| `mpRaw` | map? | subset seguro para auditoria |
| `ticketsEmitidos` | bool | |
| `qrCode` | string? | resumo / primeiro ticket |

### `pagamentos/{pagamentoId}` (ou `pedidos/{id}/pagamentos/{id}`)
Histórico imutável de eventos MP (webhooks / refunds):
- `pedidoId`, `eventoId`, `mpPaymentId`, `tipo` (`payment` \| `merchant_order` \| `refund`), `status`, `payloadResumo`, `receivedAt`, `processedAt`

### `tickets/{ticketId}`
| Campo | Notas |
|--------|--------|
| `eventoId`, `pedidoId`, `ingressoId` | |
| `ingressoKey`, `ingressoNome`, `natureza` | snapshot |
| `codigo`, `hash`, `qrPayload` | |
| `status` | `Disponível` \| `Utilizado` \| `Cancelado` |
| `checkinRealizado` | entrada (quando natureza=entrada) |
| `retiradaRealizada` | futuro (natureza=retirada) — campo reservado; UI completa depois |
| `ordem` | 1..N |

Emissão **somente** após pedido `confirmado` (pago ou gratuito), via Admin SDK nas Functions — não no cliente.

### Relação preservada após soft-delete
```
Evento (arquivado)
  → ingressos (permanecem)
  → pedidos (permanecem)
  → pagamentos (permanecem)
  → tickets (permanecem)
  → logs / reembolsos (permanecem)
```

---

## 2. Collections / documentos necessários

| Collection | Ação |
|------------|------|
| `eventos` | estender campos; soft-delete |
| `ingressos` | estender `natureza`, `exigeComprovacao`, `limitePorCompra`, `checkinModo` |
| `pedidos` | campos MP + reserva + snapshot de preço |
| `pagamentos` | **nova** (histórico webhook/refund) |
| `tickets` | campos snapshot + `retiradaRealizada` futuro |
| `checkins` | manter; evoluir depois para retirada |
| `logs` | manter |

Índices sugeridos:
- `pedidos`: `status` + `reservaExpiraEm` (job de expiração)
- `pedidos`: `eventoId` + `status`
- `ingressos`: `eventoId` + `ativo`
- `pagamentos`: `mpPaymentId` (idempotência)

---

## 3. Fluxo completo de compra

```mermaid
sequenceDiagram
  participant U as Comprador
  participant SPA as SPA
  participant CF as CloudFunctions
  participant FS as Firestore
  participant MP as MercadoPago

  U->>SPA: Escolhe tipo do evento e preenche formulário
  SPA->>CF: createCheckoutSession(eventoId, ingressoId, qtd, comprador)
  CF->>FS: Lê evento + ingresso oficiais
  CF->>CF: Valida vendas abertas, estoque, limites, soft-delete
  CF->>CF: valorUnitario oficial; total = unit * qtd
  alt total == 0
    CF->>FS: Pedido confirmado + reserva estoque + emite tickets
    CF-->>SPA: successUrl com pedidoId
  else total > 0
    CF->>FS: Pedido pendente + reserva estoque + reservaExpiraEm
    CF->>MP: Cria Preference (amount oficial, metadata)
    CF->>FS: Salva mpPreferenceId
    CF-->>SPA: initPoint URL
    SPA->>MP: Redirect Checkout Pro
  end
```

SPA **não** envia preço; se enviar, é ignorado.

---

## 4. Fluxo de pagamento Mercado Pago (Checkout Pro)

1. Preference com:
   - `items[0].unit_price` = valor oficial
   - `quantity`
   - `title` = `{evento.titulo} — {ingresso.nome}`
   - `external_reference` = `pedidoId`
   - `metadata`: `eventoId`, `ingressoId`, `pedidoId`, `natureza`
   - `back_urls`: success / pending / failure → SPA
   - `notification_url` → Function webhook
   - `expires` alinhado à reserva (~15 min)
2. Uma Preference por pedido (qualquer tipo: Inteira, VIP, Retirada, etc.).
3. Return URL **não** confirma pagamento — só UX; confirmação = webhook.

---

## 5. Fluxo de Webhook

```mermaid
sequenceDiagram
  participant MP as MercadoPago
  participant WH as CF_mpWebhook
  participant FS as Firestore

  MP->>WH: POST notificação
  WH->>WH: Valida assinatura/secret
  WH->>MP: GET payment (fonte da verdade)
  WH->>FS: Idempotência via pagamentos + mpPaymentId
  alt approved e pedido pendente
    WH->>FS: pedido confirmado + taxas/líquido MP
    WH->>FS: Emite tickets se ainda não emitidos
    WH->>WH: Enfileira/envia e-mail
  else rejected / cancelled
    WH->>FS: Atualiza status; libera estoque se reservado
  else refunded
    WH->>FS: status reembolsado; tickets cancelados; estoque+
  else pending
    WH->>FS: Atualiza mpStatus apenas
  end
```

Status MP relevantes: `pending`, `approved`, `rejected`, `cancelled`, `refunded` (e mapeamento para status interno do pedido).

---

## 6. Fluxo de expiração (15 minutos)

- Na criação: `reservaExpiraEm = now + 15min`.
- **Scheduled Function** (a cada 1–5 min) ou chamada HTTP autenticada:
  - query `status == pendente` && `reservaExpiraEm < now` && `estoqueReservado == true`
  - transaction: `status = expirado`, `estoqueReservado = false`, decrementa `quantidadeVendida` do ingresso
  - se existir Preference, tenta cancelar no MP (best-effort)
- Pedidos já `confirmado` nunca expiram.

---

## 7. Controle de estoque

- **Reservar:** ao criar pedido (pago ou grátis), incrementa `quantidadeVendida` (modelo atual).
- **Confirmar:** mantém reserva; emite tickets.
- **Expirar / cancelar / refund:** decrementa `quantidadeVendida` (devolve ao disponível).
- **Vendas fechadas se:** `now >= vendasEncerramEm` **OU** `quantidadeDisponivel == 0` **OU** evento `arquivado` **OU** tipo `ativo == false`.
- Limite por compra: `min(ingresso.limitePorCompra ?? evento.limitePorCompra, disponivel)`.

Toda mutação de estoque de pagamento/expiração/refund: **Admin SDK nas Functions** (cliente deixa de poder criar tickets / confirmar pagamento).

---

## 8. Fluxo de reembolso

1. Admin em detalhes do pedido → “Reembolsar” → confirmação explícita.
2. Callable `refundPayment(pedidoId)` (só staff):
   - lê `mpPaymentId`
   - chama API de refund MP
   - grava em `pagamentos`
   - pedido → `reembolsado`
   - tickets → `Cancelado`
   - libera estoque
3. Histórico **nunca** apagado.

---

## 9. Soft-delete de evento

- UI “Excluir” → `status: arquivado`, `arquivadoEm`, `publicado: false`.
- Some da listagem pública e de edição ativa; permanece em relatórios/financeiro.
- Bloqueia novas Preferences / pedidos.
- **Não** deleta `ingressos`, `pedidos`, `pagamentos`, `tickets`, `logs`.

---

## 10. Alterações nas Security Rules

| Recurso | Mudança |
|---------|---------|
| `eventos` | Público só lê publicados **não arquivados**; delete hard só admin (preferir update arquivar); remover ou restringir update público de estoque |
| `ingressos` | Remover update público de estoque (só Admin SDK) |
| `pedidos` | Remover create público amplo **ou** restringir a campos mínimos sem estoque; create real via Function; leitura: staff **ou** token de sucesso (`pedidoId` + secret curto) / e-mail link |
| `tickets` | **Remover create público**; só Admin SDK; leitura staff ou página sucesso autenticada por token de pedido |
| `pagamentos` | create/update só Admin SDK; read staff |

Detalhe da página de sucesso: Function gera `accessToken` opaco no pedido; SPA lê tickets via callable `getOrderReceipt(pedidoId, token)` sem abrir a coleção inteira.

---

## 11. Functions / endpoints

| Nome | Tipo | Função |
|------|------|--------|
| `createCheckoutSession` | Callable / HTTP | Valida, congela preço, reserva, Preference ou confirma grátis |
| `mpWebhook` | HTTP | Notificações MP |
| `expirePendingOrders` | Scheduled | Libera estoque 15 min |
| `getOrderReceipt` | Callable / HTTP | Página sucesso + QR |
| `refundPayment` | Callable | Reembolso admin |
| `sendOrderEmail` | (interna) | E-mail pós-confirmação |
| `ping` | HTTP | Health (já existe) |
| `syncUserClaims` | Callable | Mantém |

Stubs atuais (`confirmPayment`, `generateTickets`, `cancelOrder`, `sendEmail`) serão substituídos/reescritos por esta lógica.

---

## 12. Variáveis / Secrets

**Firebase Functions Secrets (nunca `VITE_*`):**
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET` (validação de assinatura)
- (opcional) `MERCADOPAGO_CLIENT_ID` / `CLIENT_SECRET` se necessário ao fluxo OAuth futuro

**Config não secreta (Functions config ou `.env` functions):**
- `APP_URL` = `https://eventos-sociais.vercel.app` (back_urls)
- `MERCADOPAGO_MODE` = `sandbox` \| `production`

**Frontend (`VITE_`):**
- `VITE_MP_PUBLIC_KEY` — **somente se** no futuro usar Brick; **Checkout Pro não exige** no browser (só redirect `init_point`).
- `VITE_FUNCTIONS_REGION` / URL das callables (se necessário)

Documentar em `.env.example` **nomes sem valores**.

---

## 13. Arquivos a criar / alterar (quando aprovado)

### Criar
- `functions/src/mp/createCheckoutSession.ts`
- `functions/src/mp/webhook.ts`
- `functions/src/mp/expirePendingOrders.ts`
- `functions/src/mp/refundPayment.ts`
- `functions/src/mp/getOrderReceipt.ts`
- `functions/src/mp/client.ts` (SDK/API MP)
- `functions/src/mp/pricing.ts` (leitura oficial Firestore)
- `functions/src/mp/stock.ts` / `tickets.ts`
- `functions/src/mp/email.ts`
- `src/pages/public/OrderSuccess.tsx` (rota `/pedido/:id/sucesso`)
- `src/types/ingresso.ts` (natureza, etc.) — ou extensão de models
- `docs/mercado-pago-arquitetura.md` (este arquivo)

### Alterar
- `functions/src/index.ts` — exports
- `functions/package.json` — dep `mercadopago`
- `firestore.rules` + `firestore.indexes.json`
- `src/types/pedido.ts`, `event.ts`, `ticket.ts`
- `src/services/firebase/pedidos.ts` — create público deixa de emitir ticket/MP
- `src/services/firebase/ingressos.ts` / mappers / EventForm / TicketTypesEditor
- `src/pages/public/EventRegistration.tsx` — chama Function
- `src/pages/public/EventDetails.tsx` / `EventTicketTypes.tsx` — botões por tipo ativo
- `src/pages/admin/EventForm.tsx` — soft-delete, `vendasEncerramEm`, limite, natureza; remover ênfase em `linkPagamento`
- `src/pages/admin/PurchaseDetails.tsx` / Reports — reembolso + financeiro
- `src/App.tsx` — rota sucesso
- `.env.example`, `firebase.json` (scheduler se preciso)

---

## Confirmação Firebase Functions

| Item | Estado |
|------|--------|
| Projeto default | `eventosociais-c057d` |
| Código Functions | Presente (`functions/`), Node 20 |
| Deploy MP | **Pendente** — necessário `firebase deploy --only functions` neste projeto |
| Webhook URL futura | `https://<region>-eventosociais-c057d.cloudfunctions.net/mpWebhook` |

---

## Fora do escopo desta 1ª implementação (preparado no modelo)

- Validação online de documentos da meia  
- UI completa de “marcar retirada entregue” (campo já reservado)  
- Split Payment / cashout B·C  
- Checkout Transparente  

---

## Próximo passo

Deploy das Functions + rules/indexes e configuração dos secrets no Firebase.
Ver checklist em `docs/mercado-pago-implementacao.md`.
