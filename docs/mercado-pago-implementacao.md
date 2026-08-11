# Histórico de implementação — Mercado Pago / checkout

## 2026-03-11 — Implementação inicial (arquitetura aprovada)

### Cloud Functions (`functions/src/mp/`)
- `createCheckoutSession` — valida evento/ingresso, congela preço, reserva estoque 15 min, Preference Checkout Pro ou confirma R$ 0 sem MP
- `mpWebhook` — confirma pagamento via GET payment; grava bruto/taxas/líquido efetivos; emite tickets só após `approved`
- `expirePendingOrders` — schedule 5 min + HTTP; libera estoque de pendentes expirados
- `getOrderReceipt` — recibo público por `pedidoId` + `accessToken`
- `refundPayment` — reembolso admin (Bearer token); cancela tickets; libera estoque
- Helpers: `helpers.ts`, `stock.ts` (`reserveStock` / `releaseStock` / `emitTicketsForPedido`)

### Segurança
- Rules: público não cria pedidos/tickets nem altera estoque; `pagamentos` só Admin SDK
- Soft-delete de eventos (`status: arquivado`) preserva pedidos/pagamentos/tickets
- Indexes: `pedidos(status, reservaExpiraEm)`, `eventoId+status`, `pagamentos(mpPaymentId, status)`

### SPA
- Inscrição chama Function (não grava preço/tickets no cliente)
- Página `/pedido/:id/sucesso` com poll enquanto pendente
- Relatório financeiro: bruto / taxas MP / líquido (sem taxa estimada)
- Detalhe da compra: dados MP + botão reembolsar
- Excluir evento → arquivar

### Secrets (somente Functions)
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `APP_URL`

### Deploy pendente
```bash
cd functions && npm i && npm run build
firebase deploy --only functions,firestore:rules,firestore:indexes
```
Configurar secrets no Console / Secret Manager e apontar a notification URL do MP para `mpWebhook`.
