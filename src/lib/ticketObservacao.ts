/** Textos padrão de quem pode comprar cada tipo de ingresso. */

export const DEFAULT_TICKET_OBSERVACOES: Record<string, string> = {
  inteira:
    'Entrada integral para o público geral. Não exige comprovante especial na porta.',
  meia:
    'Meia-entrada para quem tem direito legal (estudantes, idosos, PcD, jovens de baixa renda etc., conforme a legislação). Leve documento original ou comprovante válido — a comprovação é feita na entrada do evento.',
  retirada:
    'Modalidade de retirada de produto/kit/alimento no local. Não é ingresso de acesso ao evento, salvo se o organizador indicar o contrário. Apresente o QR na retirada.',
};

export function resolveTicketObservacao(type: {
  key?: string;
  descricao?: string;
  nome?: string;
}): string {
  const custom = String(type.descricao || '').trim();
  if (custom) return custom;
  const key = String(type.key || '').toLowerCase();
  if (DEFAULT_TICKET_OBSERVACOES[key]) return DEFAULT_TICKET_OBSERVACOES[key];
  const nome = String(type.nome || 'este ingresso').trim();
  return `Informações e regras de uso de ${nome}. Em caso de dúvida, fale com a organização do evento.`;
}
