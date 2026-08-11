# Teste Mercado Pago (sandbox) — sem secrets

## Arquivos locais (gitignored)
- `functions/.env` — Access Token + Public Key + MODE=sandbox
- `.env.local` — Public Key no frontend (opcional; Checkout Pro não exige)
- `.secrets/mp-sandbox-buyer.env` — usuário comprador de teste do MP

## Como testar o checkout
1. Deploy das Functions **ou** emulador com `functions/.env` carregado.
2. Abrir inscrição de um evento publicado.
3. No Checkout Pro, entrar com o **usuário de teste** do MP (não é login DELPHOS).
4. Pagar com cartão de teste do Mercado Pago.
5. Webhook em sandbox: com `MERCADOPAGO_MODE=sandbox` a assinatura é flexível se o secret ainda não existir.
6. Preferir `sandbox_init_point` automaticamente em mode sandbox.

## Segurança
- Nunca commitar Access Token, senha do usuário de teste ou Webhook Secret.
- Credenciais coladas em chat devem ser consideradas expostas; regenere no painel MP se houver risco.
- Resend permanece desativado.
