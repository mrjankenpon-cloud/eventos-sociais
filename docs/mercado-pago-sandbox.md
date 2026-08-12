# Teste Mercado Pago (sandbox)

## URL `congrats/recover/error`

Significa que o **Checkout do Mercado Pago falhou antes de criar o pagamento** (não é erro do site DELPHOS).

Causas comuns:
1. Uso do domínio **sandbox.mercadopago.com.br** (legado) — a integração agora usa `init_point` em `www.mercadopago.com.br` com credenciais de teste.
2. Login com conta **real** misturada com vendedor de teste (erro 145).
3. Comprador de teste sem aplicação no Developers.
4. Cartão/titular incorretos.

O pedido no site fica `pendente`. Abra `/pedido/{id}/sucesso` e use **Simular pagamento aprovado** se o MP continuar travando.

## Fluxo recomendado
1. Login em https://www.mercadopago.com.br com comprador `TESTUSER7715292078519435099` (não use a conta vendedora).
2. (Uma vez) Developers → criar uma aplicação nessa conta compradora.
3. Aba anônima → site DELPHOS → inscrição → pagar (nova compra).
4. Cartão de teste (BR):
   - Mastercard `5254 1336 7440 3564` ou `5480 8328 0103 3311`
   - CVV `123` · validade `11/30`
   - Nome do titular: `APRO`
   - CPF: `12345678909`
   - Parcelas: **1x**

## Contas
| Papel | User ID | Usuário |
|-------|---------|---------|
| Vendedor (token no backend) | 3605511635 | TESTUSER8245542334017809908 |
| Comprador (login no MP) | 3608384184 | TESTUSER7715292078519435099 |

Nunca pague logado como o vendedor.
