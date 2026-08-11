/** Natureza do tipo de ingresso/produto do evento (extensível). */
export type IngressoNatureza =
  | 'entrada'
  | 'retirada'
  | 'consumo'
  | 'cortesia'
  | 'outro';

export type CheckinModo = 'entrada' | 'retirada' | 'nao_aplicavel';

export function defaultNaturezaForKey(key: string): IngressoNatureza {
  const k = key.toLowerCase();
  if (k === 'retirada' || k.startsWith('retirada')) return 'retirada';
  if (k === 'cortesia' || k.startsWith('cortesia')) return 'cortesia';
  if (k.includes('consumo') || k.includes('combo')) return 'consumo';
  return 'entrada';
}

export function defaultCheckinModo(natureza: IngressoNatureza): CheckinModo {
  if (natureza === 'retirada') return 'retirada';
  if (natureza === 'cortesia' || natureza === 'consumo') return 'entrada';
  if (natureza === 'outro') return 'nao_aplicavel';
  return 'entrada';
}
