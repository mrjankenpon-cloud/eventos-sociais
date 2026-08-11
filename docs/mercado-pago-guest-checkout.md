# Guest checkout — compradores sem conta

**Regra:** compradores **não** usam Firebase Authentication.

## Identidade
- `pedidoId` + dados do comprador no pedido
- `guestCheckout: true` · sem `userId`

## Recuperação de ingressos (exclusiva por e-mail)
1. `/pedido/consultar` — informa e-mail
2. Backend gera token opaco (48h) em `guestAccessTokens`
3. Resend envia link `/meus-ingressos?t=…` (ou enfileira se API Key ausente)
4. Token valida e lista pedidos/QR **somente** daquele e-mail (read-only)

Pós-pagamento: mesmo tipo de link no e-mail de confirmação.

Página de sucesso imediata (`/pedido/:id/sucesso?token=`) usa `accessToken` do pedido (retorno MP) — não substitui a recuperação por e-mail.

## Carrinho
UI local não reserva estoque; reserva só no `createCheckoutSession`.

## Admin
`/controle` inalterado (Auth de staff).

Ver também: `docs/mercado-pago-resend.md`
