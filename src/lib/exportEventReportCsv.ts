import type { Event } from '../types/models/event';
import type { Participant } from '../types/models/participant';
import type { Purchase } from '../types/models/purchase';

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

/**
 * Gera e baixa um CSV único do relatório (resumo + participantes + pedidos).
 */
export function exportEventReportCsv(input: {
  event: Event;
  participants: Participant[];
  purchases: Purchase[];
}): void {
  const { event, participants, purchases } = input;
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
    ['Check-ins', participants.filter((p) => p.checkinRealizado).length],
    ['Bruto MP', bruto.toFixed(2)],
    ['Taxas MP', taxas.toFixed(2)],
    ['Liquido MP', liquido.toFixed(2)],
    ['Exportado em', new Date().toISOString()],
    [],
    ['SECAO', 'PARTICIPANTES'],
    [
      'Nome',
      'E-mail',
      'Telefone',
      'Ingressos',
      'Pagamento',
      'Check-in',
      'CPF',
      'Data inscricao',
    ],
    ...participants.map((p) => [
      p.nome,
      p.email,
      p.telefone,
      p.quantidadeIngressos,
      p.statusPagamento === 'confirmado' ? 'Pago' : 'Pendente',
      p.checkinRealizado ? 'Sim' : 'Nao',
      p.cpf,
      p.dataInscricao,
    ]),
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
