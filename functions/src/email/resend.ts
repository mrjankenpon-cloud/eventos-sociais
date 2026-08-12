import * as functions from 'firebase-functions/v1';
import { getAppUrl } from '../mp/helpers';

/**
 * Cliente Resend — preparado para ativação posterior.
 *
 * Secrets / env (Firebase Functions — nunca VITE_*):
 *   RESEND_API_KEY   — API Key do Resend
 *   EMAIL_FROM       — ex.: "DELPHOS <ingressos@dominio-oficial.com>"
 *   APP_URL          — base dos links (já usado pelo checkout)
 *
 * Sem API Key: não falha o fluxo de compra — apenas registra e enfileira.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
};

export function isResendConfigured(): boolean {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  return Boolean(key) && !key.startsWith('re_xxxxxxxx');
}

export function getEmailFrom(): string {
  return (
    String(process.env.EMAIL_FROM || '').trim() ||
    'DELPHOS <ingressos@institutodelphos.com.br>'
  );
}

export async function sendEmailViaResend(
  input: SendEmailInput
): Promise<{ sent: boolean; id?: string; queued?: boolean }> {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = getEmailFrom();

  if (!apiKey || apiKey.startsWith('re_xxxxxxxx')) {
    functions.logger.warn('[resend] RESEND_API_KEY ausente — e-mail enfileirado', {
      to: input.to,
      subject: input.subject,
      appUrl: getAppUrl(),
    });
    return { sent: false, queued: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tags,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!res.ok) {
    functions.logger.error('[resend] falha no envio', {
      status: res.status,
      message: body.message,
      to: input.to,
    });
    throw new Error(body.message || `Resend HTTP ${res.status}`);
  }

  functions.logger.info('[resend] enviado', { id: body.id, to: input.to });
  return { sent: true, id: body.id };
}
