import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { db, getAppUrl } from '../mp/helpers';
import { sendEmailViaResend } from './resend';
import {
  ORG,
  donationCertificateNumber,
  formatBrl,
  formatCpfCnpj,
} from '../orgInfo';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendDonationCertificateEmail(pedido: {
  id: string;
  email?: string;
  nomeComprador?: string;
  cpf?: string;
  documentoTipo?: string;
  valorTotal?: number;
  dataCompra?: string;
  certificadoNumero?: string;
  accessToken?: string;
}): Promise<{ sent: boolean }> {
  const email = String(pedido.email || '')
    .trim()
    .toLowerCase();
  if (!email.includes('@')) return { sent: false };

  const numero =
    String(pedido.certificadoNumero || '') ||
    donationCertificateNumber(
      pedido.id,
      String(pedido.dataCompra || new Date().toISOString())
    );
  const valor = Number(pedido.valorTotal) || 0;
  const nome = String(pedido.nomeComprador || 'Doador');
  const doc = formatCpfCnpj(String(pedido.cpf || ''));
  const token = String(pedido.accessToken || '');
  const certUrl = `${getAppUrl()}/doacao/${pedido.id}/sucesso${
    token ? `?token=${encodeURIComponent(token)}` : ''
  }`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.55;color:#111;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1655a3;color:#fff;padding:20px 24px;">
      <p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;">Instituto</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:800;letter-spacing:.2em;">DELPHOS</p>
    </div>
    <div style="padding:24px;">
      <p>Olá, ${escapeHtml(nome)}!</p>
      <p>Recebemos sua doação. Boas ações são sempre bem-vindas — o seu gesto fortalece o convívio, os eventos e o apoio às instituições parceiras.</p>
      <p style="margin:16px 0;padding:16px;background:#e8f0f8;border-radius:12px;">
        <strong>Certificado:</strong> ${escapeHtml(numero)}<br/>
        <strong>Valor:</strong> ${escapeHtml(formatBrl(valor))}<br/>
        <strong>${pedido.documentoTipo === 'cnpj' ? 'CNPJ' : 'CPF'}:</strong> ${escapeHtml(doc)}
      </p>
      <p>A entidade beneficiária é a ${escapeHtml(ORG.razaoSocial)}, CNPJ ${escapeHtml(ORG.cnpj)}.</p>
      <p style="margin:24px 0;">
        <a href="${certUrl}"
           style="background:#1655a3;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">
          Ver e imprimir o certificado
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;">
        Este e-mail é um recibo de doação voluntária. Não garante dedução no Imposto de Renda.
        Consulte um profissional de sua confiança.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const result = await sendEmailViaResend({
      to: email,
      subject: `Obrigado pela doação — certificado ${numero}`,
      html,
      text: `Olá, ${nome}!\n\nRecebemos sua doação de ${formatBrl(valor)}.\nCertificado: ${numero}\nEntidade: ${ORG.razaoSocial} — CNPJ ${ORG.cnpj}\n\nVer certificado: ${certUrl}\n\nEste recibo não garante dedução no Imposto de Renda.`,
      tags: [
        { name: 'purpose', value: 'donation' },
        { name: 'product', value: 'delphos' },
      ],
    });

    if (result.sent) {
      await db()
        .collection('pedidos')
        .doc(pedido.id)
        .set(
          {
            confirmationEmailSentAt:
              admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    await db().collection('logs').add({
      acao: result.sent ? 'email_sent' : 'email_queued',
      colecao: 'pedidos',
      documentoId: pedido.id,
      descricao: result.sent
        ? 'E-mail de certificado de doação enviado'
        : 'E-mail de certificado de doação enfileirado',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { sent: Boolean(result.sent) };
  } catch (err) {
    functions.logger.error('[sendDonationCertificateEmail]', err);
    return { sent: false };
  }
}
