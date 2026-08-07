import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../firebase/firestore';
import type { Pedido, PedidoUpdate } from '../../types/pedido';
import type { Purchase } from '../../types/models/purchase';
import type { Ticket } from '../../types/models/ticket';
import type { Participant } from '../../types/models/participant';
import {
  COLLECTIONS,
  col,
  docRef,
  mapDoc,
  stripUndefined,
  timestamps,
  touchUpdated,
  wrapError,
  type PageResult,
  type PaginateOptions,
} from './helpers';
import { pedidoToPurchase, purchaseInputToPedidoPayload } from './mappers';
import { logsService } from './logs';
import { buildQrPayload, generateTicketQrSecrets, parseQrPayload } from '../../lib/qr';

type PurchaseInput = Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'statusPagamento'>;

function stockFields(quantidade: number, vendida: number) {
  const quantidadeVendida = Math.max(0, vendida);
  const quantidadeDisponivel = Math.max(0, quantidade - quantidadeVendida);
  return { quantidadeVendida, quantidadeDisponivel };
}

export const pedidosService = {
  /**
   * Cria pedido + reserva estoque + emite tickets com QR,
   * tudo sob runTransaction para evitar oversell.
   */
  async create(data: PurchaseInput): Promise<Purchase> {
    try {
      if (!data.ticketTypeId) {
        throw new Error('Tipo de ingresso obrigatório');
      }
      if (data.quantidadeIngressos < 1) {
        throw new Error('Quantidade inválida');
      }

      const pedidoRef = doc(col(COLLECTIONS.pedidos));
      const ingressoRef = docRef(COLLECTIONS.ingressos, data.ticketTypeId);
      const eventoRef = docRef(COLLECTIONS.eventos, data.eventId);
      const payload = purchaseInputToPedidoPayload(data);

      await runTransaction(db, async (tx) => {
        const ingressoSnap = await tx.get(ingressoRef);
        if (!ingressoSnap.exists()) {
          throw new Error('Ingresso não encontrado');
        }
        const ingresso = ingressoSnap.data();
        if (ingresso.ativo === false) {
          throw new Error('Ingresso indisponível');
        }

        const total = Number(ingresso.quantidade) || 0;
        const vendida = Number(ingresso.quantidadeVendida) || 0;
        const disponivel = Math.max(0, total - vendida);

        if (data.quantidadeIngressos > disponivel) {
          throw new Error(
            disponivel <= 0
              ? 'Ingresso ESGOTADO'
              : `Apenas ${disponivel} ingresso(s) disponível(is)`
          );
        }

        const nextVendida = vendida + data.quantidadeIngressos;
        const stock = stockFields(total, nextVendida);

        tx.set(pedidoRef, {
          ...stripUndefined(payload as unknown as Record<string, unknown>),
          qrCode: '',
          estoqueReservado: true,
          ativo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        tx.update(ingressoRef, {
          ...stock,
          ...touchUpdated(),
        });

        const eventoSnap = await tx.get(eventoRef);
        if (eventoSnap.exists()) {
          const ev = eventoSnap.data();
          const max = Number(ev.quantidadeMaxima) || total;
          const restanteAtual =
            typeof ev.quantidadeRestante === 'number'
              ? ev.quantidadeRestante
              : max - vendida;
          tx.update(eventoRef, {
            quantidadeRestante: Math.max(0, restanteAtual - data.quantidadeIngressos),
            ...touchUpdated(),
          });
        }
      });

      const purchaseBase = pedidoToPurchase({
        id: pedidoRef.id,
        ...payload,
        qrCode: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const tickets = await this.createTicketsForPurchase(purchaseBase);
      const firstQr = tickets[0]?.qrPayload || tickets[0]?.codigo || '';

      await updateDoc(pedidoRef, {
        qrCode: firstQr,
        ...touchUpdated(),
      });

      await logsService.record({
        acao: 'create',
        colecao: COLLECTIONS.pedidos,
        documentoId: pedidoRef.id,
        descricao: `Pedido criado para ${data.compradorNome}`,
        after: {
          eventoId: data.eventId,
          quantidade: data.quantidadeIngressos,
          ingressoId: data.ticketTypeId,
          valorTotal: data.valorTotal,
        },
      });

      return { ...purchaseBase, id: pedidoRef.id };
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('[')) {
        console.error('[pedidos.create]', error);
        throw error;
      }
      wrapError('pedidos.create', error);
    }
  },

  async getPedidoById(id: string): Promise<Pedido | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.pedidos, id));
      if (!snap.exists()) return undefined;
      return mapDoc<Pedido>(snap as Parameters<typeof mapDoc>[0]);
    } catch (error) {
      wrapError('pedidos.getPedidoById', error);
    }
  },

  async getById(id: string): Promise<Purchase | undefined> {
    try {
      const pedido = await this.getPedidoById(id);
      return pedido ? pedidoToPurchase(pedido) : undefined;
    } catch (error) {
      wrapError('pedidos.getById', error);
    }
  },

  async getAll(): Promise<Purchase[]> {
    try {
      const snap = await getDocs(col(COLLECTIONS.pedidos));
      return snap.docs
        .map((d) => pedidoToPurchase(mapDoc<Pedido>(d)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      wrapError('pedidos.getAll', error);
    }
  },

  async update(id: string, data: Partial<Purchase>): Promise<Purchase> {
    try {
      const before = await this.getById(id);
      const patch: PedidoUpdate = {};
      if (data.compradorNome !== undefined) patch.nomeComprador = data.compradorNome;
      if (data.compradorCPF !== undefined) patch.cpf = data.compradorCPF;
      if (data.compradorTelefone !== undefined) patch.telefone = data.compradorTelefone;
      if (data.compradorEmail !== undefined) patch.email = data.compradorEmail;
      if (data.eventId !== undefined) patch.eventoId = data.eventId;
      if (data.quantidadeIngressos !== undefined) patch.quantidade = data.quantidadeIngressos;
      if (data.valorTotal !== undefined) patch.valorTotal = data.valorTotal;
      if (data.linkPagamento !== undefined) patch.linkPagamento = data.linkPagamento;
      if (data.ticketTypeId !== undefined) patch.ingressoId = data.ticketTypeId;
      if (data.ticketTypeNome !== undefined) patch.ingressoNome = data.ticketTypeNome;
      if (data.statusPagamento !== undefined) {
        patch.status =
          data.statusPagamento === 'confirmado'
            ? 'confirmado'
            : data.statusPagamento === 'cancelado'
              ? 'cancelado'
              : 'pendente';
      }

      await updateDoc(docRef(COLLECTIONS.pedidos, id), {
        ...stripUndefined(patch as Record<string, unknown>),
        ...touchUpdated(),
      });

      const updated = await this.getById(id);
      if (!updated) throw new Error('Pedido não encontrado');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.pedidos,
        documentoId: id,
        descricao: 'Pedido atualizado',
        before: before as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      return updated;
    } catch (error) {
      wrapError('pedidos.update', error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const tickets = await this.getTicketsByPurchaseId(id);
      await Promise.all(tickets.map((t) => deleteDoc(docRef(COLLECTIONS.tickets, t.id))));
      await deleteDoc(docRef(COLLECTIONS.pedidos, id));
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.pedidos,
        documentoId: id,
        descricao: 'Pedido removido',
      });
    } catch (error) {
      wrapError('pedidos.delete', error);
    }
  },

  async getActive(): Promise<Purchase[]> {
    try {
      const all = await this.getAll();
      return all.filter((p) => p.statusPagamento !== 'cancelado');
    } catch (error) {
      wrapError('pedidos.getActive', error);
    }
  },

  async getByEvento(eventoId: string): Promise<Purchase[]> {
    return this.getByEventId(eventoId);
  },

  async getByEventId(eventId: string): Promise<Purchase[]> {
    try {
      const q = query(
        col(COLLECTIONS.pedidos),
        where('eventoId', '==', eventId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => pedidoToPurchase(mapDoc<Pedido>(d)));
    } catch {
      const all = await this.getAll();
      return all.filter((p) => p.eventId === eventId);
    }
  },

  async search(term: string): Promise<Purchase[]> {
    try {
      const all = await this.getAll();
      const q = term.trim().toLowerCase();
      if (!q) return all;
      return all.filter(
        (p) =>
          p.compradorNome.toLowerCase().includes(q) ||
          p.compradorEmail.toLowerCase().includes(q) ||
          p.compradorCPF.includes(q)
      );
    } catch (error) {
      wrapError('pedidos.search', error);
    }
  },

  async paginate(options: PaginateOptions = {}): Promise<PageResult<Purchase>> {
    try {
      const pageSize = options.pageSize ?? 20;
      const constraints: QueryConstraint[] = [
        orderBy(options.orderField ?? 'createdAt', options.orderDir ?? 'desc'),
        limit(pageSize + 1),
      ];
      const snap = await getDocs(query(col(COLLECTIONS.pedidos), ...constraints));
      const docs = snap.docs.map((d) => pedidoToPurchase(mapDoc<Pedido>(d)));
      return {
        items: docs.slice(0, pageSize),
        pageSize,
        hasMore: docs.length > pageSize,
      };
    } catch (error) {
      wrapError('pedidos.paginate', error);
    }
  },

  /**
   * Confirma pagamento sob transação.
   * Se o estoque ainda não foi reservado na criação, aplica quantidadeVendida aqui.
   */
  async confirmPayment(id: string): Promise<Purchase> {
    try {
      const pedidoRef = docRef(COLLECTIONS.pedidos, id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(pedidoRef);
        if (!snap.exists()) throw new Error('Pedido não encontrado');
        const pedido = snap.data();

        if (pedido.status === 'confirmado') return;
        if (pedido.status === 'cancelado') {
          throw new Error('Pedido cancelado não pode ser confirmado');
        }

        const reservado = Boolean(pedido.estoqueReservado);
        const ingressoId = String(pedido.ingressoId || pedido.itens?.[0]?.ingressoId || '');
        const qty = Number(pedido.quantidade) || 0;

        if (!reservado && ingressoId && qty > 0) {
          const ingressoRef = docRef(COLLECTIONS.ingressos, ingressoId);
          const ingressoSnap = await tx.get(ingressoRef);
          if (!ingressoSnap.exists()) throw new Error('Ingresso não encontrado');
          const ingresso = ingressoSnap.data();
          const total = Number(ingresso.quantidade) || 0;
          const vendida = Number(ingresso.quantidadeVendida) || 0;
          const disponivel = Math.max(0, total - vendida);
          if (qty > disponivel) {
            throw new Error(
              disponivel <= 0 ? 'Ingresso ESGOTADO' : `Estoque insuficiente (${disponivel})`
            );
          }
          const next = stockFields(total, vendida + qty);
          tx.update(ingressoRef, { ...next, ...touchUpdated() });

          const eventoRef = docRef(COLLECTIONS.eventos, String(pedido.eventoId));
          const eventoSnap = await tx.get(eventoRef);
          if (eventoSnap.exists()) {
            const ev = eventoSnap.data();
            const max = Number(ev.quantidadeMaxima) || total;
            const restante =
              typeof ev.quantidadeRestante === 'number' ? ev.quantidadeRestante : max - vendida;
            tx.update(eventoRef, {
              quantidadeRestante: Math.max(0, restante - qty),
              ...touchUpdated(),
            });
          }
        }

        tx.update(pedidoRef, {
          status: 'confirmado',
          estoqueReservado: true,
          ...touchUpdated(),
        });
      });

      const updated = await this.getById(id);
      if (!updated) throw new Error('Pedido não encontrado após confirmação');

      await logsService.record({
        acao: 'confirmPayment',
        colecao: COLLECTIONS.pedidos,
        documentoId: id,
        descricao: 'Pagamento confirmado',
        alteracoes: [
          { campo: 'status', de: 'pendente', para: 'confirmado' },
        ],
      });

      return updated;
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('[')) {
        console.error('[pedidos.confirmPayment]', error);
        throw error;
      }
      wrapError('pedidos.confirmPayment', error);
    }
  },

  // ---- Tickets emitidos ----

  async createTicketsForPurchase(purchase: Purchase): Promise<Ticket[]> {
    try {
      const created: Ticket[] = [];

      for (let i = 1; i <= purchase.quantidadeIngressos; i++) {
        const ticketRef = doc(col(COLLECTIONS.tickets));
        const secrets = await generateTicketQrSecrets(ticketRef.id);
        const status: Ticket['status'] = 'Disponível';
        const qrPayload = buildQrPayload({
          ticketId: ticketRef.id,
          codigo: secrets.codigo,
          hash: secrets.hash,
          createdAt: secrets.createdAt,
          status,
        });

        await runTransaction(db, async (tx) => {
          tx.set(ticketRef, {
            codigo: secrets.codigo,
            hash: secrets.hash,
            qrPayload,
            eventoId: purchase.eventId,
            compraId: purchase.id,
            pedidoId: purchase.id,
            ingressoId: purchase.ticketTypeId ?? '',
            status,
            ordem: i,
            checkinRealizado: false,
            ativo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });

        const ticket = await this.getTicketById(ticketRef.id);
        if (ticket) created.push(ticket);
      }

      return created;
    } catch (error) {
      wrapError('pedidos.createTicketsForPurchase', error);
    }
  },

  async getTicketById(id: string): Promise<Ticket | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.tickets, id));
      if (!snap.exists()) return undefined;
      return mapDoc<Ticket>(snap as Parameters<typeof mapDoc>[0]);
    } catch (error) {
      wrapError('pedidos.getTicketById', error);
    }
  },

  async getTicketsByPurchaseId(purchaseId: string): Promise<Ticket[]> {
    try {
      const q = query(
        col(COLLECTIONS.tickets),
        where('compraId', '==', purchaseId),
        orderBy('ordem', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Ticket>(d));
    } catch {
      const snap = await getDocs(col(COLLECTIONS.tickets));
      return snap.docs
        .map((d) => mapDoc<Ticket>(d))
        .filter((t) => t.compraId === purchaseId)
        .sort((a, b) => a.ordem - b.ordem);
    }
  },

  async getTicketsByEventId(eventId: string): Promise<Ticket[]> {
    try {
      const q = query(col(COLLECTIONS.tickets), where('eventoId', '==', eventId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc<Ticket>(d));
    } catch (error) {
      wrapError('pedidos.getTicketsByEventId', error);
    }
  },

  async getAllTickets(): Promise<Ticket[]> {
    try {
      const snap = await getDocs(col(COLLECTIONS.tickets));
      return snap.docs.map((d) => mapDoc<Ticket>(d));
    } catch (error) {
      wrapError('pedidos.getAllTickets', error);
    }
  },

  async getTicketByCode(code: string): Promise<Ticket | undefined> {
    try {
      const parsed = parseQrPayload(code);
      if (parsed?.ticketId) {
        const byId = await this.getTicketById(parsed.ticketId);
        if (byId) {
          if (parsed.hash && byId.hash && parsed.hash !== byId.hash) {
            throw new Error('QR inválido: hash não confere');
          }
          return byId;
        }
      }

      if (parsed?.hash) {
        const qHash = query(
          col(COLLECTIONS.tickets),
          where('hash', '==', parsed.hash),
          limit(1)
        );
        const snapHash = await getDocs(qHash);
        if (!snapHash.empty) return mapDoc<Ticket>(snapHash.docs[0]);
      }

      const codigo = parsed?.codigo || code.trim();
      const q = query(col(COLLECTIONS.tickets), where('codigo', '==', codigo), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return undefined;
      return mapDoc<Ticket>(snap.docs[0]);
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith('[')) {
        console.error('[pedidos.getTicketByCode]', error);
        throw error;
      }
      wrapError('pedidos.getTicketByCode', error);
    }
  },

  async updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket> {
    try {
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = data;
      await updateDoc(docRef(COLLECTIONS.tickets, id), {
        ...stripUndefined(rest as Record<string, unknown>),
        ...touchUpdated(),
      });
      const updated = await this.getTicketById(id);
      if (!updated) throw new Error('Ticket não encontrado');
      return updated;
    } catch (error) {
      wrapError('pedidos.updateTicket', error);
    }
  },

  async deleteTicket(id: string): Promise<void> {
    try {
      await deleteDoc(docRef(COLLECTIONS.tickets, id));
    } catch (error) {
      wrapError('pedidos.deleteTicket', error);
    }
  },

  async getParticipantsByEventId(eventId: string): Promise<Participant[]> {
    try {
      const purchases = await this.getByEventId(eventId);
      const tickets = await this.getTicketsByEventId(eventId);

      return purchases.map((p) => {
        const pts = tickets.filter((t) => t.compraId === p.id);
        const checked = pts.filter((t) => t.checkinRealizado);
        return {
          id: p.id,
          eventId: p.eventId,
          nome: p.compradorNome,
          cpf: p.compradorCPF,
          telefone: p.compradorTelefone,
          email: p.compradorEmail,
          quantidadeIngressos: p.quantidadeIngressos,
          termosAceitos: true,
          statusPagamento:
            p.statusPagamento === 'confirmado' ? 'confirmado' : 'pendente',
          checkIn: checked.map((t) => t.checkinEm || t.updatedAt).filter(Boolean) as string[],
          checkinRealizado: checked.length > 0,
          dataInscricao: p.createdAt,
        } satisfies Participant;
      });
    } catch (error) {
      wrapError('pedidos.getParticipantsByEventId', error);
    }
  },
};
