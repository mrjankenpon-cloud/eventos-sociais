import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase/firestore';
import { auth } from '../../firebase/auth';
import type { Checkin, CheckinCreate, CheckinUpdate } from '../../types/checkin';
import type { Ticket } from '../../types/models/ticket';
import type { TicketHistory, TicketHistoryType } from '../../types/models/ticketHistory';
import {
  COLLECTIONS,
  col,
  docRef,
  mapDoc,
  stripUndefined,
  timestamps,
  touchUpdated,
  wrapError,
} from './helpers';
import { pedidosService } from './pedidos';
import { logsService } from './logs';

type HistoryInput = {
  ticketId: string;
  tipo: TicketHistoryType;
  usuario: string;
  observacao?: string;
};

function historyFromCheckin(c: Checkin): TicketHistory {
  const tipoMap: Record<string, TicketHistoryType> = {
    realizado: 'Check-in realizado',
    cancelado: 'Check-in cancelado',
    pendente: 'Compra criada',
  };
  return {
    id: c.id,
    ticketId: c.ticketId,
    tipo: tipoMap[c.status] ?? 'Check-in realizado',
    data: c.horario || c.createdAt,
    usuario: c.usuarioResponsavelNome,
    observacao: c.observacao,
  };
}

export const checkinsService = {
  async create(data: CheckinCreate): Promise<Checkin> {
    try {
      const ref = await addDoc(col(COLLECTIONS.checkins), {
        ...stripUndefined({
          ...data,
          ativo: data.ativo ?? true,
        } as unknown as Record<string, unknown>),
        ...timestamps(),
      });
      const created = await this.getById(ref.id);
      if (!created) throw new Error('Falha ao criar check-in');

      await logsService.record({
        acao: 'checkin',
        colecao: COLLECTIONS.checkins,
        documentoId: created.id,
        descricao: `Check-in: ${created.pessoaNome}`,
        after: created as unknown as Record<string, unknown>,
      });

      return created;
    } catch (error) {
      wrapError('checkins.create', error);
    }
  },

  async getById(id: string): Promise<Checkin | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.checkins, id));
      if (!snap.exists()) return undefined;
      return mapDoc<Checkin>(snap as Parameters<typeof mapDoc>[0]);
    } catch (error) {
      wrapError('checkins.getById', error);
    }
  },

  async getAll(): Promise<Checkin[]> {
    try {
      const q = query(col(COLLECTIONS.checkins), orderBy('horario', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Checkin>(d));
    } catch {
      const snap = await getDocs(col(COLLECTIONS.checkins));
      return snap.docs
        .map((d) => mapDoc<Checkin>(d))
        .sort((a, b) => b.horario.localeCompare(a.horario));
    }
  },

  async update(id: string, data: CheckinUpdate): Promise<Checkin> {
    try {
      const before = await this.getById(id);
      await updateDoc(docRef(COLLECTIONS.checkins, id), {
        ...stripUndefined(data as Record<string, unknown>),
        ...touchUpdated(),
      });
      const updated = await this.getById(id);
      if (!updated) throw new Error('Check-in não encontrado');
      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.checkins,
        documentoId: id,
        descricao: 'Check-in atualizado',
        before: before as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });
      return updated;
    } catch (error) {
      wrapError('checkins.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(docRef(COLLECTIONS.checkins, id));
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.checkins,
        documentoId: id,
        descricao: 'Check-in removido',
      });
    } catch (error) {
      wrapError('checkins.delete', error);
    }
  },

  async getByEvento(eventoId: string): Promise<Checkin[]> {
    try {
      const q = query(
        col(COLLECTIONS.checkins),
        where('eventoId', '==', eventoId),
        orderBy('horario', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Checkin>(d));
    } catch {
      const all = await this.getAll();
      return all.filter((c) => c.eventoId === eventoId);
    }
  },

  /** Remove check-ins de um evento (usado no purge de relatório). */
  async deleteByEvento(eventoId: string): Promise<number> {
    try {
      const list = await this.getByEvento(eventoId);
      const CHUNK = 400;
      for (let i = 0; i < list.length; i += CHUNK) {
        const batch = writeBatch(db);
        for (const item of list.slice(i, i + CHUNK)) {
          batch.delete(docRef(COLLECTIONS.checkins, item.id));
        }
        await batch.commit();
      }
      return list.length;
    } catch (error) {
      wrapError('checkins.deleteByEvento', error);
    }
  },

  async getByPedido(pedidoId: string): Promise<Checkin[]> {
    try {
      const q = query(col(COLLECTIONS.checkins), where('pedidoId', '==', pedidoId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Checkin>(d));
    } catch {
      const all = await this.getAll();
      return all.filter((c) => c.pedidoId === pedidoId);
    }
  },

  async logHistory(data: HistoryInput): Promise<TicketHistory> {
    try {
      const ticket = await pedidosService.getTicketById(data.ticketId);
      const checkin = await this.create({
        pedidoId: ticket?.compraId ?? '',
        ingressoId: ticket?.ingressoId ?? '',
        ticketCodigo: ticket?.codigo ?? '',
        ticketId: data.ticketId,
        pessoaNome: data.usuario,
        horario: new Date().toISOString(),
        usuarioResponsavelId: auth.currentUser?.uid || 'sistema',
        usuarioResponsavelNome: data.usuario,
        eventoId: ticket?.eventoId ?? '',
        status:
          data.tipo === 'Check-in cancelado'
            ? 'cancelado'
            : data.tipo === 'Check-in realizado'
              ? 'realizado'
              : 'pendente',
        observacao: data.observacao ?? data.tipo,
        ativo: true,
      });
      return historyFromCheckin(checkin);
    } catch (error) {
      wrapError('checkins.logHistory', error);
    }
  },

  async getByTicketId(ticketId: string): Promise<TicketHistory[]> {
    try {
      const q = query(
        col(COLLECTIONS.checkins),
        where('ticketId', '==', ticketId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => historyFromCheckin(mapDoc<Checkin>(d)));
    } catch {
      const all = await this.getAll();
      return all.filter((c) => c.ticketId === ticketId).map(historyFromCheckin);
    }
  },

  async getAllHistory(): Promise<TicketHistory[]> {
    const all = await this.getAll();
    return all.map(historyFromCheckin);
  },

  async getTicketByCode(code: string): Promise<Ticket | undefined> {
    return pedidosService.getTicketByCode(code);
  },

  /**
   * Check-in atômico:
   * valida existência, status, evento, duplicidade; registra horário e responsável.
   */
  async performCheckin(
    ticketIdOrQr: string,
    operator: string,
    expectedEventoId?: string
  ): Promise<Ticket> {
    try {
      let ticket =
        (await pedidosService.getTicketById(ticketIdOrQr)) ||
        (await pedidosService.getTicketByCode(ticketIdOrQr));

      if (!ticket) throw new Error('QR/ticket não encontrado');

      if (expectedEventoId && ticket.eventoId !== expectedEventoId) {
        throw new Error('Ticket não pertence a este evento');
      }

      const eventoSnap = await getDoc(docRef(COLLECTIONS.eventos, ticket.eventoId));
      if (!eventoSnap.exists()) {
        throw new Error('Evento do ticket não encontrado');
      }

      const ticketRef = docRef(COLLECTIONS.tickets, ticket.id);
      const checkinRef = docRef(COLLECTIONS.checkins, `ck_${ticket.id}`);
      const horario = new Date().toISOString();
      const operadorId = auth.currentUser?.uid || 'admin';
      const operadorNome = operator || auth.currentUser?.displayName || 'Operador';

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ticketRef);
        if (!snap.exists()) throw new Error('Ticket não encontrado');
        const current = snap.data();

        if (
          current.status === 'Cancelado' ||
          current.status === 'Reembolsado' ||
          current.status === 'Bloqueado'
        ) {
          throw new Error(
            `Ticket ${current.status} — check-in/retirada bloqueados`
          );
        }
        if (expectedEventoId && current.eventoId !== expectedEventoId) {
          throw new Error('Ticket não pertence a este evento');
        }

        const isRetirada =
          String(current.natureza || '') === 'retirada' ||
          String(current.checkinModo || '') === 'retirada';

        if (isRetirada) {
          // Status financeiro é independente: só impede se ticket cancelado/reembolsado
          if (current.retiradaRealizada === true) {
            throw new Error('Retirada já realizada — duplicado bloqueado');
          }
          tx.update(ticketRef, {
            retiradaRealizada: true,
            retiradaEm: horario,
            // Mantém status Disponível se entrada ainda não feita; senão Utilizado
            status:
              current.checkinRealizado === true ? 'Utilizado' : current.status,
            operador: operadorNome,
            updatedAt: serverTimestamp(),
          });
        } else {
          if (current.checkinRealizado === true || current.status === 'Utilizado') {
            throw new Error('Check-in já realizado — duplicado bloqueado');
          }
          if (current.status !== 'Disponível') {
            throw new Error(`Ticket indisponível (Status: ${current.status})`);
          }
          tx.update(ticketRef, {
            status: 'Utilizado',
            checkinRealizado: true,
            checkinEm: horario,
            operador: operadorNome,
            updatedAt: serverTimestamp(),
          });
        }

        tx.set(checkinRef, {
          pedidoId: current.compraId || current.pedidoId || '',
          ingressoId: current.ingressoId || '',
          ticketCodigo: current.codigo,
          ticketId: ticket!.id,
          pessoaNome: operadorNome,
          horario,
          usuarioResponsavelId: operadorId,
          usuarioResponsavelNome: operadorNome,
          eventoId: current.eventoId,
          status: 'realizado',
          tipo: isRetirada ? 'retirada' : 'entrada',
          observacao: isRetirada
            ? 'Retirada de produto via painel'
            : current.exigeComprovacao || current.ingressoKey === 'meia'
              ? 'Check-in meia-entrada — validar documento presencialmente'
              : 'Check-in via painel administrativo',
          ativo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      const isRetiradaTicket =
        ticket.natureza === 'retirada' ||
        (ticket as { checkinModo?: string }).checkinModo === 'retirada';

      await logsService.record({
        acao: isRetiradaTicket ? 'retirada' : 'checkin',
        colecao: COLLECTIONS.tickets,
        documentoId: ticket.id,
        descricao: isRetiradaTicket
          ? `Retirada realizada por ${operadorNome}`
          : `Check-in realizado por ${operadorNome}`,
        alteracoes: isRetiradaTicket
          ? [{ campo: 'retiradaRealizada', de: false, para: true }]
          : [
              { campo: 'status', de: 'Disponível', para: 'Utilizado' },
              { campo: 'checkinRealizado', de: false, para: true },
            ],
        metadata: {
          eventoId: ticket.eventoId,
          horario,
          operador: operadorNome,
          ingressoKey: ticket.ingressoKey,
        },
      });

      const updated = await pedidosService.getTicketById(ticket.id);
      if (!updated) throw new Error('Falha ao ler ticket após check-in');
      return updated;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('[')) {
        console.error('[checkins.performCheckin]', error);
        throw error;
      }
      wrapError('checkins.performCheckin', error);
    }
  },
};

/** @deprecated Use checkinsService */
export const checkinService = {
  ...checkinsService,
  create: (data: HistoryInput) => checkinsService.logHistory(data),
  getAll: () => checkinsService.getAllHistory(),
  getById: async (id: string): Promise<TicketHistory | undefined> => {
    const c = await checkinsService.getById(id);
    return c ? historyFromCheckin(c) : undefined;
  },
  update: async (id: string, data: Partial<HistoryInput>): Promise<TicketHistory> => {
    const updated = await checkinsService.update(id, {
      observacao: data.observacao,
      usuarioResponsavelNome: data.usuario,
    });
    return historyFromCheckin(updated);
  },
};
