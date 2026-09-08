import { db, isoWithOffset, moneyString, splitBrPhone, splitPersonName } from './helpers';

export type BuyerPurchaseProfile = {
  is_first_purchase_online: boolean;
  last_purchase?: string;
  registration_date: string;
};

export type MpIndustryItem = {
  id: string;
  title: string;
  description: string;
  category_id: string;
  quantity: number;
  unit_price: number;
  event_date?: string;
};

/** Checkout Pro industry data: Native web | Other (guest checkout no site). */
export type MpAuthType = 'Native web' | 'Other';

function toIso(raw: unknown): string | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    const t = Date.parse(raw);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
    return undefined;
  }
  if (typeof raw === 'object' && raw && 'toDate' in raw) {
    try {
      return (raw as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Tipo de autenticação do comprador no site (guest checkout web).
 * Valores alinhados à doc Checkout Pro / industry data do MP.
 */
export function authTypeFromRequest(req: {
  headers?: Record<string, unknown>;
}): MpAuthType {
  const ua = String(
    req.headers?.['user-agent'] || req.headers?.['User-Agent'] || ''
  );
  // Site responsivo = Native web; bots/headless → Other.
  if (!ua || /bot|crawler|spider|headless|curl|wget/i.test(ua)) return 'Other';
  return 'Native web';
}

/** Data/hora do evento no fuso de Brasília, para `event_date` do MP. */
export function eventDateForMp(evento: Record<string, unknown>): string | undefined {
  const data = String(evento.data || '').trim();
  if (!data) return undefined;
  if (data.includes('T')) {
    const d = new Date(data);
    return Number.isNaN(d.getTime()) ? undefined : isoWithOffset(d);
  }
  const horaRaw = String(evento.horaInicio || '19:00').trim() || '19:00';
  const hora = /^\d{2}:\d{2}$/.test(horaRaw) ? `${horaRaw}:00` : horaRaw;
  const d = new Date(`${data}T${hora}-03:00`);
  return Number.isNaN(d.getTime()) ? undefined : isoWithOffset(d);
}

export async function loadBuyerPurchaseProfile(
  email: string
): Promise<BuyerPurchaseProfile> {
  const nowIso = new Date().toISOString();
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@')) {
    return { is_first_purchase_online: true, registration_date: nowIso };
  }

  try {
    const snap = await db()
      .collection('pedidos')
      .where('email', '==', normalized)
      .limit(40)
      .get();

    const dates: string[] = [];
    const paid: string[] = [];
    for (const doc of snap.docs) {
      const row = doc.data() || {};
      const when =
        toIso(row.dataCompra) || toIso(row.createdAt) || toIso(row.updatedAt);
      if (when) dates.push(when);
      const status = String(row.status || '');
      if (status === 'confirmado' || status === 'approved') {
        if (when) paid.push(when);
      }
    }
    dates.sort();
    paid.sort();
    return {
      is_first_purchase_online: paid.length === 0,
      last_purchase: paid.length ? paid[paid.length - 1] : undefined,
      registration_date: dates[0] || nowIso,
    };
  } catch {
    return { is_first_purchase_online: true, registration_date: nowIso };
  }
}

export function mpIndustryPayer(input: {
  nome: string;
  telefone?: string;
  documento?: string;
  documentoTipo?: 'cpf' | 'cnpj';
  authenticationType: MpAuthType;
  profile: BuyerPurchaseProfile;
}): Record<string, unknown> {
  const names = splitPersonName(input.nome);
  const phone = splitBrPhone(input.telefone || '');
  const digits = String(input.documento || '').replace(/\D/g, '');
  const reg = input.profile.registration_date;

  const payer: Record<string, unknown> = {
    first_name: names.first_name,
    last_name: names.last_name,
    // Checkout Pro industry data usa date_created; API BR tickets usa registration_date.
    authentication_type: input.authenticationType,
    date_created: reg,
    registration_date: reg,
    is_prime_user: false,
    is_first_purchase_online: input.profile.is_first_purchase_online,
  };

  if (input.profile.last_purchase) {
    payer.last_purchase = input.profile.last_purchase;
  }

  if (phone) {
    payer.phone = {
      area_code: phone.area_code,
      number: phone.number,
    };
  }

  if (input.documentoTipo === 'cnpj' && digits.length === 14) {
    payer.identification = { type: 'CNPJ', number: digits };
  } else if (digits.length === 11) {
    payer.identification = { type: 'CPF', number: digits };
  }

  return payer;
}

/**
 * Ingressos digitais / retirada no local — sem endereço do comprador.
 * Sinal recomendado pelo MP mesmo quando não há frete.
 */
export function mpDigitalShipments(): Record<string, unknown> {
  return {
    mode: 'not_specified',
    local_pickup: true,
  };
}

/** Itens no formato da API Orders (`unit_price` string). */
export function mpOrderIndustryItems(
  items: MpIndustryItem[]
): Record<string, unknown>[] {
  return items.map((item) => ({
    title: item.title.slice(0, 256),
    description: item.description.slice(0, 256),
    external_code: item.id.slice(0, 64),
    category_id: item.category_id,
    quantity: item.quantity,
    unit_price: moneyString(item.unit_price),
    ...(item.event_date ? { event_date: item.event_date } : {}),
  }));
}

/**
 * Itens em additional_info da preferência — inclui event_date + category_descriptor
 * (sinais de tickets/entertainment). Não usar no array top-level `items` do
 * Checkout Pro hospedado (event_date ali pode deixar o botão Pagar cinza).
 */
export function mpPreferenceIndustryItems(
  items: MpIndustryItem[]
): Record<string, unknown>[] {
  return items.map((item) => {
    const row: Record<string, unknown> = {
      id: item.id.slice(0, 64),
      title: item.title.slice(0, 256),
      description: item.description.slice(0, 256),
      category_id: item.category_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    };
    if (item.event_date) {
      row.event_date = item.event_date;
      row.category_descriptor = { event_date: item.event_date };
    }
    return row;
  });
}

/** Itens da preferência Checkout Pro — só campos que o checkout hospedado aceita. */
export function mpCheckoutProItems(
  items: MpIndustryItem[]
): Record<string, unknown>[] {
  return items.map((item) => ({
    id: item.id.slice(0, 64),
    title: item.title.slice(0, 256),
    description: item.description.slice(0, 256),
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency_id: 'BRL',
    category_id: item.category_id,
  }));
}

/** Monta additional_info completo para preferências Checkout Pro. */
export function mpPreferenceAdditionalInfo(input: {
  clientIp?: string;
  items: MpIndustryItem[];
  payer: ReturnType<typeof mpIndustryPayer>;
}): Record<string, unknown> {
  return {
    ...(input.clientIp ? { ip_address: input.clientIp } : {}),
    items: mpPreferenceIndustryItems(input.items),
    payer: input.payer,
  };
}
