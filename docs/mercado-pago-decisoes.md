# Decisões fechadas — Mercado Pago (referência)

Registrado em 2026-08-11 a partir das respostas do produto.

1. Conta MP própria do Instituto — sim  
2. Checkout Pro (redirect) — sim  
3. Secrets só Firebase Functions — sim  
4. Projeto `eventosociais-c057d` + deploy Functions — sim  
5. Tipos por evento (incl. Retirada como produto); R$ 0 = gratuito sem MP  
6. Meia: sem comprovação online; validação na porta no check-in  
7. Limite por evento (e por tipo se definido); controle de estoque  
8. Encerrar vendas: `vendasEncerramEm` OU estoque zero (o que ocorrer primeiro)  
9. Reserva pendente: 15 minutos → expira e devolve estoque  
10. Formulário atual — manter  
11. Sucesso na página + e-mail com QR  
12. Total R$ 0 → confirma no backend sem MP  
13. Cashout A — só acompanhamento; sem split  
14. Relatório com bruto/taxas/líquido (dados da API MP)  
15. Reembolso via API no admin + confirmação; histórico imutável  
16. Soft-delete de eventos  
17. Preço congelado no pedido na criação  

Extras de arquitetura:
- Tipos genéricos por evento (não hardcode inteira/meia/retirada no gateway)
- Uma única integração MP dinâmica
- `natureza` extensível: entrada | retirada | consumo | cortesia | outro
