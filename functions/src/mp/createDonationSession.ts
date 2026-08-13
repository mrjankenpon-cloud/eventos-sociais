import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import {
  RESERVE_MINUTES,
  db,
  getAppUrl,
  getSandboxPayerEmail,
  isMercadoPagoSandbox,
  mpFetch,
  randomToken,
  roundMoney,
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
      const reservaExpiraEm = new Date(
        agora.getTime() + RESERVE_MINUTES * 60 * 1000
      );
      const pedidoRef = db().collection('pedidos').doc();
      const certificadoNumero = donationCertificateNumber(
        pedidoRef.id,
        agora.toISOString()
      );

      const basePedido: Record<string, unknown> = {
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
        qrCode: '',
        dataCompra: agora.toISOString(),
        formaPagamento: 'mercadopago',
        estoqueReservado: false,
        reservaExpiraEm: reservaExpiraEm.toISOString(),
        ticketsEmitidos: false,
        accessToken,
        guestCheckout: true,
        ativo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const appUrl = getAppUrl();
      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        'eventosociais-c057d';
      const successUrl = `${appUrl}/doacao/${pedidoRef.id}/sucesso`;

      const preferenceBody: Record<string, unknown> = {
        items: [
          {
            id: 'doacao',
            title: 'Doação — Instituto Delphos',
            quantity: 1,
            unit_price: valor,
            currency_id: 'BRL',
          },
        ],
        payer: {
          email: getSandboxPayerEmail(email),
          ...(isMercadoPagoSandbox()
            ? {}
            : {
                name: nome,
                identification: {
                  type: documentoTipo === 'cnpj' ? 'CNPJ' : 'CPF',
                  number: documento,
                },
              }),
        },
        external_reference: pedidoRef.id,
        metadata: {
          pedidoId: pedidoRef.id,
          tipo: 'doacao',
          eventoId: '',
        },
        back_urls: {
          success: successUrl,
          pending: successUrl,
          failure: successUrl,
        },
        auto_return: 'approved',
        notification_url: `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`,
        statement_descriptor: 'DELPHOS',
        payment_methods: {
          excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
          installments: 1,
          default_installments: 1,
        },
      };

      const preference = (await mpFetch('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(preferenceBody),
      })) as {
        id: string;
        init_point?: string;
        sandbox_init_point?: string;
      };

      const initPoint =
        preference.init_point || preference.sandbox_init_point || '';

      await pedidoRef.set({
        ...basePedido,
        mpPreferenceId: preference.id,
        linkPagamento: initPoint,
      });

      res.json({
        ok: true,
        pedidoId: pedidoRef.id,
        accessToken,
        preferenceId: preference.id,
        initPoint,
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
