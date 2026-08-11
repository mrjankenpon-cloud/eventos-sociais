# Levantamento Mercado Pago — Eventos Sociais

**Status:** análise concluída — aguardando decisões (sem implementação de código).  
**Data:** 2026-08-11  
**Projeto:** Delphos / eventos-sociais (`eventosociais-c057d`)

---

## A. Arquitetura atual

### Stack
- **Frontend:** React 19 + Vite 6 + TypeScript + Tailwind + React Router 7 (SPA).
- **Dados:** Firebase client SDK (Auth + Firestore + Storage/imagens).
- **Admin:** `/controle/*` com `ProtectedRoute`.
- **Público:** `/`, `/evento/:id`, `/evento/:id/inscricao`.
- **Cloud Functions** (`functions/src/`): stubs (`confirmPayment`, `generateTickets`, `sendEmail`, `cancelOrder`) + `syncUserClaims` real + HTTP `ping`. Sem webhook Mercado Pago.
- **Sem API Express** no código. Deploy típico: Vercel (SPA) + Firebase.

### Modelo de negócio já no código
Inteira / Meia / Retirada já são tipos **por evento** (`src/lib/eventForm.ts` → `defaultTicketTypes()`), com `valor`, `ativo` e `quantidade` independentes.

- Persistência: coleção `ingressos` (por tipo, vinculados ao evento) + documento `eventos`.
- Admin: aba Ingressos em `EventForm` + `TicketTypesEditor`.
- Isolamento: cada tipo tem `id` próprio; alterar Evento B não altera Evento A.

### Fluxo público de compra hoje
1. Usuário preenche dados e escolhe tipo em `EventRegistration`.
2. SPA calcula total no cliente.
3. Cria `pedidos` com `status: pendente`.
4. Reserva estoque (`ingressos` / `eventos`).
5. Emite `tickets` com QR **imediatamente** (antes de pagamento confirmado).
6. Se `linkPagamento` existir, redireciona para URL externa.

Pagamento: **não há gateway**. Só `event.linkPagamento` e `formaPagamento: 'externo' | 'gratuito'`.

### Collections relevantes
| Collection   | Papel                                      |
|--------------|--------------------------------------------|
| `eventos`    | Evento (flags, `linkPagamento`, etc.)      |
| `ingressos`  | Tipos/preços/estoque por evento           |
| `pedidos`    | Compra (comprador, valorTotal, status)     |
| `tickets`    | Ingressos com QR                           |
| `checkins`   | Check-in                                   |
| `logs`       | Auditoria                                  |

### Segurança (impacto MP)
- Público pode criar `pedidos` (`pendente`) e `tickets`.
- Comprador não lê pedidos/tickets depois (só staff).
- `valorTotal` do cliente **não é revalidado** nas rules contra `ingressos.valor`.
- Segredos MP **não podem** ser `VITE_*`.

### Env atual
`.env.example`: Firebase web + admin email. Nenhuma variável Mercado Pago.

---

## B. Pontos a envolver na implementação futura

| Área | Peças |
|------|--------|
| UI admin | `EventForm.tsx`, `TicketTypesEditor`, `linkPagamento` |
| UI pública | `EventDetails`, `EventTicketTypes`, `EventRegistration` |
| Domínio | `event.ts`, `pedido.ts`, `purchase.ts` |
| Services | `pedidos.ts`, `ingressos.ts`, `eventos.ts`, mappers |
| Backend | Novas Cloud Functions (Preference + webhook) |
| Rules | `pedidos` / `tickets` (emissão server-side pós-pagamento) |
| Secrets | Firebase Functions Secrets |

---

## C. Arquitetura proposta (conceitual)

```
Evento → Tipo ingresso → Pedido pendente → CF Create Preference
  → Mercado Pago Checkout → Pagamento → Webhook MP
  → CF Webhook (valida + consulta API) → Pedido confirmado
  → Emitir tickets → Entrega QR → Check-in
```

**Princípios:**
1. Preço oficial no backend a partir de Firestore — nunca confiar no browser.
2. Credenciais privadas só em Cloud Functions.
3. Confirmação = webhook + consulta à API MP.
4. Cada transação com `eventoId`, tipo, preço, quantidade, total, comprador, ids MP, status.

**Recomendação de produto:** Checkout Pro (Preferences), salvo decisão contrária.

---

## D. Modelo de dados proposto (rascunho)

**Manter:** `eventos` + `ingressos`.

**Estender `pedidos`:** `ingressoId` / `ingressoKey` / `valorUnitarioOficial`, `mpPreferenceId`, `mpPaymentId`, `mpStatus`, `mpStatusDetail`, `formaPagamento` real.

**Opcional:** coleção/subcoleção `pagamentos` para idempotência de webhooks.

**`tickets`:** emitir **após** status `approved`.

**Evento excluído (recomendação):** soft-delete / arquivado; nunca apagar histórico financeiro.

**Preço alterado no meio da compra:** decisão pendente (congelar / invalidar Preference / revalidar no webhook).

---

## E / F. Perguntas e decisões (preencher)

Responda item a item (pode copiar e colar com a resposta ao lado).

### Mercado Pago

1. Já têm conta Mercado Pago (PJ) e acesso ao painel de desenvolvedores? (sandbox vs produção)
2. Checkout Pro (redirect) ou Checkout Transparente (na página)?
3. Secrets em Firebase Functions Secrets — ok?
4. Domínio canônico do app e Functions no projeto `eventosociais-c057d` — confirmam deploy das Functions?

### Regras dos ingressos

5. Retirada: sempre paga, ou `permitirRetiradaGratuita` pula MP?
6. Meia: exige comprovação ou só seleção?
7. Limite por comprador (hoje 10 na UI / 20 nas rules)?
8. Venda encerra por: esgotamento, data/hora, toggle manual, combinação?
9. Pedido pendente sem pagar: quanto tempo segura estoque (TTL)?

### Fluxo de compra

10. Manter formulário atual (nome, CPF, telefone, e-mail, qtd, tipo) ou mais campos?
11. Após aprovado: ingresso por e-mail, página de sucesso, ou ambos?
12. `valor === 0`: emite na hora sem MP — confirma?

### Financeiro / cashout

13. Cashout: **A** acompanhar arrecadação | **B** transferir auto | **C** split Instituto × instituição?
14. Relatórios com bruto, taxas e líquido?
15. Reembolso: só painel MP ou botão admin (API)?

### Integridade

16. Soft-delete de evento + bloquear vendas — ok?
17. Preço mudou com Preference pendente: congelar valor, invalidar Preference, ou outra?

---

## G. Próximo passo (após respostas)

1. Plano de implementação detalhado em etapas (para sua aprovação).
2. Só então alterar código, rules e Functions.

**Não cole Access Token, Client Secret nem webhook secret neste chat.** Configure no Firebase Console / CLI quando formos implementar.
