# Teste Mercado Pago (sandbox)

## Botão Pagar cinza no Checkout Pro

Causas comuns:
1. Conta **compradora** de teste sem **aplicação** no painel Developers (crie uma app logado como comprador).
2. Preferência antiga com parcelas 10x — inicie compra **nova**.
3. Titular do cartão sem `APRO` + CPF `12345678909` no formulário do cartão.

### Contingência no site
Na página `/pedido/:id/sucesso` (sandbox), use **Simular pagamento aprovado** se o MP travar. Emite ingressos e grava pagamento simulado.

### Fluxo recomendado
1. Login em mercadopago.com.br com comprador `TESTUSER7715292078519435099`.
2. (Uma vez) Developers → criar aplicação na conta compradora.
3. Aba anônima → site → inscrição → pagar.
4. Cartão: `5480 8328 0103 3311` / CVV `123` / `11/30` / nome `APRO` / CPF `12345678909` / **1x**.

## Contas
| Papel | User ID | Usuário |
|-------|---------|---------|
| Vendedor (token) | 3605511635 | TESTUSER8245542334017809908 |
| Comprador (login) | 3608384184 | TESTUSER7715292078519435099 |
