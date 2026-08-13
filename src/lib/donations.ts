import type { Purchase } from '../types/models/purchase';
import { formatCpfCnpj } from './orgInfo';

export function isDonationPurchase(p: Purchase): boolean {
  return p.tipo === 'doacao';
}

export function isTicketPurchase(p: Purchase): boolean {
  return p.tipo !== 'doacao' && p.tipo !== 'upgrade';
}

export function donationDate(p: Purchase): Date {
  const raw = p.dataCompra || p.createdAt;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

export function formatDonorDocument(p: Purchase): string {
  return formatCpfCnpj(p.compradorCPF);
}

export function donorDocumentLabel(p: Purchase): string {
  return p.documentoTipo === 'cnpj' ? 'CNPJ' : 'CPF';
}

export type DonationStats = {
  total: number;
  confirmadas: number;
  pendentes: number;
  canceladas: number;
  valorConfirmado: number;
  valorPendente: number;
  ticketMedio: number;
  doadoresUnicos: number;
  valorMesAtual: number;
  qtdMesAtual: number;
  ultimaDoacao: Purchase | null;
  maiorDoacao: Purchase | null;
};

export function computeDonationStats(donations: Purchase[]): DonationStats {
  const confirmed = donations.filter((d) => d.statusPagamento === 'confirmado');
  const pending = donations.filter((d) => d.statusPagamento === 'pendente');
  const cancelled = donations.filter((d) =>
    ['cancelado', 'expirado', 'reembolsado'].includes(d.statusPagamento)
  );

  const valorConfirmado = confirmed.reduce((s, d) => s + (d.valorTotal || 0), 0);
  const valorPendente = pending.reduce((s, d) => s + (d.valorTotal || 0), 0);
  const ticketMedio =
    confirmed.length > 0 ? valorConfirmado / confirmed.length : 0;
  const doadoresUnicos = new Set(
    confirmed.map((d) => d.compradorEmail.trim().toLowerCase()).filter(Boolean)
  ).size;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const mesAtual = confirmed.filter((d) => donationDate(d) >= monthStart);
  const valorMesAtual = mesAtual.reduce((s, d) => s + (d.valorTotal || 0), 0);

  const sortedByDate = [...confirmed].sort(
    (a, b) => donationDate(b).getTime() - donationDate(a).getTime()
  );

  let maiorDoacao: Purchase | null = null;
  for (const d of confirmed) {
    if (!maiorDoacao || d.valorTotal > maiorDoacao.valorTotal) {
      maiorDoacao = d;
    }
  }

  return {
    total: donations.length,
    confirmadas: confirmed.length,
    pendentes: pending.length,
    canceladas: cancelled.length,
    valorConfirmado,
    valorPendente,
    ticketMedio,
    doadoresUnicos,
    valorMesAtual,
    qtdMesAtual: mesAtual.length,
    ultimaDoacao: sortedByDate[0] ?? null,
    maiorDoacao,
  };
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportDonationsCsv(donations: Purchase[]): void {
  const rows: Array<Array<string | number>> = [
    [
      'Certificado',
      'Doador',
      'Documento',
      'E-mail',
      'Telefone',
      'Valor',
      'Status',
      'Data',
      'Mensagem',
      'ID pedido',
    ],
    ...donations.map((d) => [
      d.certificadoNumero || '',
      d.compradorNome,
      formatDonorDocument(d),
      d.compradorEmail,
      d.compradorTelefone,
      d.valorTotal,
      d.statusPagamento,
      donationDate(d).toLocaleString('pt-BR'),
      d.mensagemDoador || '',
      d.id,
    ]),
  ];

  const bom = '\uFEFF';
  const body = rows.map((r) => r.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `doacoes-delphos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function donationStatusBadgeVariant(
  status: Purchase['statusPagamento']
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'confirmado') return 'success';
  if (status === 'pendente') return 'warning';
  if (status === 'reembolsado' || status === 'cancelado') return 'danger';
  return 'neutral';
}

export function donationStatusLabel(status: Purchase['statusPagamento']): string {
  const labels: Record<Purchase['statusPagamento'], string> = {
    confirmado: 'Confirmada',
    pendente: 'Pendente',
    cancelado: 'Cancelada',
    expirado: 'Expirada',
    reembolsado: 'Reembolsada',
  };
  return labels[status] || status;
}
