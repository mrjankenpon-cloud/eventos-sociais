import * as admin from 'firebase-admin';
import { db } from '../mp/helpers';

export type EmailDeliveryStatus = 'sent' | 'queued' | 'delayed';

/** Persiste no pedido o resultado do e-mail (para a tela de sucesso orientar o usuário). */
export async function persistPedidoEmailDelivery(
  pedidoId: string,
  result: { sent?: boolean; queued?: boolean; delayed?: boolean },
  extra?: Record<string, unknown>
): Promise<EmailDeliveryStatus> {
  const status: EmailDeliveryStatus = result.sent
    ? 'sent'
    : result.delayed
      ? 'delayed'
      : 'queued';

  const payload: Record<string, unknown> = {
    emailDelivery: status,
    emailDeliveryUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...extra,
  };

  if (result.sent) {
    payload.confirmationEmailSentAt =
      admin.firestore.FieldValue.serverTimestamp();
  }

  await db().collection('pedidos').doc(pedidoId).set(payload, { merge: true });
  return status;
}
