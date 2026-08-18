import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import {
  PIX_MINUTES,
  db,
  getAppUrl,
  isoWithOffset,
  isLiveMpAccessToken,
  mpFetch,
  pixFromPayment,
  randomToken,
  roundMoney,
  type MpPixPayment,
} from './helpers';
import { donationCertificateNumber } from '../orgInfo';

const MIN_DONATION = 10;
const MAX_DONATION = 50_000;

type DonationBody = {
  valor?: number;
  mensagem?: string;
  doador?: {
    nome?: string;
    documento?: string;
    documentoTipo?: 'cpf' | 'cnpj';
    email?: string;
    telefone?: string;
  };
};

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function validateCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factor - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 || rest === 11 ? 0 : rest;
  };
  return (
    digit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    digit(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}

function validateCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += Number(cnpj[i]) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

async function createDonationPix(input: {
  pedidoId: string;
  valor: number;
  email: string;
  nome: string;
  documento: string;
  documentoTipo: 'cpf' | 'cnpj';
  expiresAt: string;
  notificationUrl: string;
}) {
  if (!isLiveMpAccessToken()) {
    throw new Error(
      'Doação via PIX exige credenciais de produção do Mercado Pago (APP_USR). Ative pagamentos PIX na aplicação.'
    );
  }

  const email = String(input.email || '').trim().toLowerCase();
  const digits = input.documento.replace(/\D/g, '');
  const payer: Record<string, unknown> = {
    email: email.includes('@') ? email : 'ingressos@institutodelphos.com.br',
    first_name: (input.nome || 'Doador').slice(0, 60),
  };
  if (input.documentoTipo === 'cnpj' && digits.length === 14) {
    payer.identification = { type: 'CNPJ', number: digits };
  } else if (digits.length === 11) {
    payer.identification = { type: 'CPF', number: digits };
  }

  try {
    const payment = await mpFetch<MpPixPayment>('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': `donation-pix-${input.pedidoId}` },
      body: JSON.stringify({
        transaction_amount: input.valor,
        description: 'Doação — Instituto Delphos'.slice(0, 255),
        payment_method_id: 'pix',
        payer,
        external_reference: input.pedidoId,
        notification_url: input.notificationUrl,
        date_of_expiration: input.expiresAt,
        metadata: {
          pedido_id: input.pedidoId,
          tipo: 'doacao',
        },
      }),
    });
    const pix = pixFromPayment(payment);
    if (!pix.qrCode) {
      throw new Error('Mercado Pago não devolveu o código PIX da doação');
    }
    return pix;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/401|unauthorized|live credentials/i.test(msg)) {
      throw new Error(
        'O Mercado Pago recusou gerar PIX com estas credenciais. Ative PIX/pagamentos via API na aplicação de produção.'
      );
    }
    throw error;
  }
}

/** Cria doação pendente e devolve QR PIX (Checkout Transparente). */
export const createDonationSession = functions.https.onRequest(
  async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const body = (req.body || {}) as DonationBody;
      const doador = body.doador || {};
      const nome = String(doador.nome || '').trim();
      const documento = String(doador.documento || '').replace(/\D/g, '');
      const documentoTipo =
        doador.documentoTipo === 'cnpj' || documento.length === 14
          ? 'cnpj'
          : 'cpf';
      const telefone = String(doador.telefone || '').trim();
      const email = String(doador.email || '').trim().toLowerCase();
      const mensagem = String(body.mensagem || '').trim().slice(0, 280);
      const valor = roundMoney(Number(body.valor) || 0);

      const docOk =
        documentoTipo === 'cnpj'
          ? validateCnpj(documento)
          : validateCpf(documento);

      if (nome.length < 4 || !docOk || !email.includes('@')) {
        res.status(400).json({ error: 'Dados do doador inválidos' });
        return;
      }
      if (valor < MIN_DONATION) {
        res.status(400).json({
          error: `Valor mínimo da doação: R$ ${MIN_DONATION.toFixed(2)}`,
        });
        return;
      }
      if (valor > MAX_DONATION) {
        res.status(400).json({
          error: `Valor máximo por operação: R$ ${MAX_DONATION.toFixed(2)}`,
        });
        return;
      }

      const accessToken = randomToken(32);
      const agora = new Date();
      const pixExpira = new Date(agora.getTime() + PIX_MINUTES * 60 * 1000);
      const pedidoRef = db().collection('pedidos').doc();
      const certificadoNumero = donationCertificateNumber(
        pedidoRef.id,
        agora.toISOString()
      );

      const appUrl = getAppUrl();
      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        'eventosociais-c057d';
      const notificationUrl = `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`;
      const successUrl = `${appUrl}/doacao/${pedidoRef.id}/sucesso`;

      await pedidoRef.set({
        tipo: 'doacao',
        nomeComprador: nome,
        cpf: documento,
        documentoTipo,
        telefone,
        email,
        eventoId: '',
        ingressoId: 'doacao',
        ingressoNome: 'Doação',
        natureza: 'doacao',
        mensagemDoador: mensagem || null,
        certificadoNumero,
        itens: [
          {
            ingressoId: 'doacao',
            nome: 'Doação',
            key: 'doacao',
            natureza: 'doacao',
            quantidade: 1,
            valorUnitario: valor,
          },
        ],
        quantidade: 1,
        valorUnitario: valor,
        valorTotal: valor,
        status: 'pendente',
        dataCompra: agora.toISOString(),
        formaPagamento: 'pix',
        estoqueReservado: false,
        reservaExpiraEm: pixExpira.toISOString(),
        ticketsEmitidos: false,
        accessToken,
        guestCheckout: true,
        ativo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      let pix: ReturnType<typeof pixFromPayment>;
      try {
        pix = await createDonationPix({
          pedidoId: pedidoRef.id,
          valor,
          email,
          nome,
          documento,
          documentoTipo,
          expiresAt: isoWithOffset(pixExpira),
          notificationUrl,
        });
        await pedidoRef.update({
          qrCode: pix.qrCode,
          pixQrCode: pix.qrCode,
          pixQrCodeBase64: pix.qrCodeBase64,
          pixTicketUrl: pix.ticketUrl || null,
          pixExpiresAt: pix.expiresAt || pixExpira.toISOString(),
          mpPaymentId: pix.paymentId,
          mpStatus: pix.status || 'pending',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (pixError) {
        await pedidoRef.update({
          status: 'cancelado',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        throw pixError;
      }

      res.json({
        ok: true,
        pix: true,
        pedidoId: pedidoRef.id,
        accessToken,
        qrCode: pix.qrCode,
        qrCodeBase64: pix.qrCodeBase64,
        ticketUrl: pix.ticketUrl || undefined,
        expiresAt: pix.expiresAt || pixExpira.toISOString(),
        receiptUrl: `${successUrl}?token=${accessToken}`,
      });
    } catch (error) {
      functions.logger.error('[createDonationSession]', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Falha ao criar doação',
      });
    }
  }
);
