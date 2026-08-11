# Resend — e-mail transacional (preparado, aguardando domínio)

**Status:** implementação pronta · conta/domínio/API Key **ainda não** · **sem deploy de e-mail**

## Provedor
Resend (`https://api.resend.com/emails`)

## Variáveis (Firebase Functions Secrets — nunca `VITE_*`)

| Nome | Exemplo / placeholder | Obrigatório |
|------|----------------------|-------------|
| `RESEND_API_KEY` | `re_xxxxxxxx` (vazio até criar conta) | para envio real |
| `EMAIL_FROM` | `DELPHOS <ingressos@dominio-oficial.com>` | sim (quando ativo) |
| `APP_URL` | `https://eventos-sociais.vercel.app` | links nos e-mails |

Sem `RESEND_API_KEY` válida: compra/webhook **continuam** — e-mail fica `email_queued` nos logs.

## Fluxos

### Recuperação (público)
`/pedido/consultar` → `requestGuestTicketsEmail` → token 48h → e-mail → `/meus-ingressos?t=…` → `getGuestTickets`

- Resposta sempre genérica (anti-enumeração)
- Sem login / senha / Auth de comprador
- Somente leitura

### Confirmação pós-pagamento
Webhook approved / pedido gratuito → `sendOrderConfirmationEmail` (mesmo link seguro)

## Ativação futura (checklist)
1. Oficializar domínio
2. Criar conta Resend
3. Verificar domínio (DNS SPF/DKIM)
4. Criar API Key
5. Secret Manager: `RESEND_API_KEY`, `EMAIL_FROM`
6. Teste envio
7. Teste recuperação
8. Teste e-mail pós-pagamento

## Arquivos
- `functions/src/email/resend.ts`
- `functions/src/email/guestAccess.ts`
- `functions/src/email/guestHttp.ts`
- `src/pages/public/OrderLookup.tsx`
- `src/pages/public/MyTickets.tsx`
