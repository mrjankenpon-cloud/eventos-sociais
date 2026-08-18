import type { Event } from '../types/models/event';
import type { Purchase } from '../types/models/purchase';
import type { Ticket } from '../types/models/ticket';

function csvEscape(value: string | number | boolean | null | undefined): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
  const bom = '\uFEFF';
  const body = rows.map((r) => r.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilePart(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'evento'
  );
}

function ticketRows(
  purchases: Purchase[],
  tickets: Ticket[]
): Array<Array<string | number>> {
  const purchaseById = new Map(purchases.map((p) => [p.id, p]));
  const byPurchase = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const key = t.compraId || t.pedidoId || '';
    if (!key) continue;
    const list = byPurchase.get(key) || [];
    list.push(t);
    byPurchase.set(key, list);
  }

  const rows: Array<Array<string | number>> = [];
  for (const p of purchases) {
    if (p.statusPagamento !== 'confirmado' && p.statusPagamento !== 'pendente') {
      continue;
    }
    const pts = (byPurchase.get(p.id) || [])
      .slice()
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const pago = p.statusPagamento === 'confirmado' ? 'Pago' : 'Pendente';
    if (pts.length > 0) {
      for (const t of pts) {
        const done =
          t.natureza === 'retirada'
            ? Boolean(t.retiradaRealizada)
            : t.checkinRealizado === true || t.status === 'Utilizado';
        rows.push([
          p.compradorNome,
          p.compradorEmail,
          p.compradorTelefone,
          t.codigo,
          t.ingressoNome || p.ticketTypeNome || '',
          pago,
          done ? 'Sim' : 'Nao',
          p.compradorCPF,
          p.createdAt || p.dataCompra || '',
        ]);
      }
      continue;
    }
    const total = Math.max(1, p.quantidadeIngressos || 1);
    for (let i = 0; i < total; i += 1) {
      rows.push([
        p.compradorNome,
        p.compradorEmail,
        p.compradorTelefone,
        '',
        p.ticketTypeNome || '',
        pago,
        'Nao',
        p.compradorCPF,
        p.createdAt || p.dataCompra || '',
      ]);
    }
  }

  for (const t of tickets) {
    const key = t.compraId || t.pedidoId || '';
    if (key && purchaseById.has(key)) continue;
    const done =
      t.natureza === 'retirada'
        ? Boolean(t.retiradaRealizada)
        : t.checkinRealizado === true || t.status === 'Utilizado';
    rows.push([
      '',
      '',
      '',
      t.codigo,
      t.ingressoNome || '',
      '',
      done ? 'Sim' : 'Nao',
      '',
      t.createdAt,
    ]);
  }

  return rows;
}

/**
 * Gera e baixa um CSV único do relatório (resumo + ingressos + pedidos).
 */
export function exportEventReportCsv(input: {
  event: Event;
  purchases: Purchase[];
  tickets: Ticket[];
}): void {
  const { event, purchases, tickets } = input;
  const confirmed = purchases.filter((p) => p.statusPagamento === 'confirmado');
  let bruto = 0;
  let taxas = 0;
  let liquido = 0;
  for (const p of confirmed) {
    if (typeof p.mpTransactionAmount === 'number' && p.mpTransactionAmount >= 0) {
      bruto += p.mpTransactionAmount;
      taxas += Number(p.mpFeeAmount) || 0;
      liquido +=
        typeof p.mpNetReceivedAmount === 'number'
          ? p.mpNetReceivedAmount
          : p.mpTransactionAmount - (Number(p.mpFeeAmount) || 0);
    } else {
      bruto += p.valorTotal;
      liquido += p.valorTotal;
    }
  }

  const pending = purchases.filter((p) => p.statusPagamento === 'pendente');
  const active = purchases.filter(
    (p) =>
      p.statusPagamento === 'confirmado' || p.statusPagamento === 'pendente'
  );

  const rows: Array<Array<string | number>> = [
    ['SECAO', 'RESUMO'],
    ['Campo', 'Valor'],
    ['Evento', event.titulo],
    ['Evento ID', event.id],
    ['Data', event.data],
    ['Local', event.local],
    ['Vagas do evento (salao)', event.vagas ?? 0],
    ['Inscritos', active.length],
    [
      'Ingressos Pagos',
      confirmed.reduce((a, p) => a + p.quantidadeIngressos, 0),
    ],
    [
      'Ingressos Pendentes',
      pending.reduce((a, p) => a + p.quantidadeIngressos, 0),
    ],
    [
      'Valor Arrecadado',
      confirmed.reduce((a, p) => a + p.valorTotal, 0).toFixed(2),
    ],
    [
      'Check-ins',
      tickets.filter(
        (t) => t.checkinRealizado === true || t.status === 'Utilizado'
      ).length,
    ],
    ['Bruto MP', bruto.toFixed(2)],
    ['Taxas MP', taxas.toFixed(2)],
    ['Liquido MP', liquido.toFixed(2)],
    ['Exportado em', new Date().toISOString()],
    [],
    ['SECAO', 'INGRESSOS'],
    [
      'Nome',
      'E-mail',
      'Telefone',
      'Codigo',
      'Tipo',
      'Pagamento',
      'Check-in',
      'CPF',
      'Data inscricao',
    ],
    ...ticketRows(purchases, tickets),
    [],
    ['SECAO', 'PEDIDOS'],
    [
      'Pedido ID',
      'Comprador',
      'CPF',
      'E-mail',
      'Telefone',
      'Qtd',
      'Valor total',
      'Status',
      'MP Payment ID',
      'Bruto MP',
      'Taxa MP',
      'Liquido MP',
      'Criado em',
    ],
    ...purchases.map((p) => [
      p.id,
      p.compradorNome,
      p.compradorCPF,
      p.compradorEmail,
      p.compradorTelefone,
      p.quantidadeIngressos,
      p.valorTotal.toFixed(2),
      p.statusPagamento,
      p.mpPaymentId || '',
      p.mpTransactionAmount ?? '',
      p.mpFeeAmount ?? '',
      p.mpNetReceivedAmount ?? '',
      p.createdAt,
    ]),
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsv(`relatorio-${safeFilePart(event.titulo)}-${stamp}.csv`, rows);
}
