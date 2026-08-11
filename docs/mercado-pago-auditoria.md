# Auditoria pré-deploy — Mercado Pago (2026-03-11)

Correções aplicadas nesta sessão (antes do deploy):

1. Emissão de tickets atômica (`ticketsEmitidos` em transaction)
2. Liberação de estoque atômica (`transitionPedidoReleaseStock`)
3. Idempotência de `pagamentos` por doc id `{mpPaymentId}_{status}`
4. Validação valor pago == valor congelado do pedido
5. Webhook fail-closed sem secret (exceto sandbox/SKIP_VERIFY)
6. `expirePendingOrdersHttp` exige autenticação staff
7. Reembolso somente admin + claim `refundInProgress`
8. Check-in de retirada separado (`retiradaRealizada`) vs entrada
9. Rules: update de tickets limitado a campos operacionais

Deploy: **bloqueado** até aprovação explícita.
