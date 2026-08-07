import { getDoc, setDoc } from 'firebase/firestore';
import type { AppSettings, AppSettingsFormData } from '../../types/models/settings';
import type { Configuracao } from '../../types/configuracao';
import { APP_CONFIG } from '../../config';
import {
  COLLECTIONS,
  docRef,
  mapDoc,
  stripUndefined,
  timestamps,
  touchUpdated,
  wrapError,
} from './helpers';
import { configuracaoToSettings, settingsToConfiguracao } from './mappers';
import { logsService } from './logs';

const SETTINGS_DOC_ID = 'app';

const DEFAULTS: AppSettingsFormData = {
  nome: APP_CONFIG.name,
  descricao: APP_CONFIG.description,
  email: APP_CONFIG.contact.email,
  telefone: APP_CONFIG.contact.phone,
  endereco: APP_CONFIG.contact.address,
};

export const configuracoesService = {
  async create(data: AppSettingsFormData): Promise<AppSettings> {
    try {
      await setDoc(docRef(COLLECTIONS.configuracoes, SETTINGS_DOC_ID), {
        ...stripUndefined(settingsToConfiguracao(data)),
        ...timestamps(),
      });
      await logsService.record({
        acao: 'create',
        colecao: COLLECTIONS.configuracoes,
        documentoId: SETTINGS_DOC_ID,
        descricao: 'Configurações criadas',
      });
      return this.get();
    } catch (error) {
      wrapError('configuracoes.create', error);
    }
  },

  async getById(id: string = SETTINGS_DOC_ID): Promise<AppSettings | undefined> {
    try {
      const snap = await getDoc(docRef(COLLECTIONS.configuracoes, id));
      if (!snap.exists()) return undefined;
      const raw = mapDoc<Configuracao & AppSettings>(snap);
      if (raw.nomeSistema) return configuracaoToSettings(raw);
      // Legado UI shape
      return {
        id: raw.id,
        nome: (raw as AppSettings).nome ?? raw.nomeSistema ?? '',
        descricao: raw.descricao ?? '',
        email: raw.email ?? '',
        telefone: raw.telefone ?? '',
        endereco: raw.endereco ?? '',
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      };
    } catch (error) {
      wrapError('configuracoes.getById', error);
    }
  },

  async getAll(): Promise<AppSettings[]> {
    try {
      return [await this.get()];
    } catch (error) {
      wrapError('configuracoes.getAll', error);
    }
  },

  async get(): Promise<AppSettings> {
    try {
      const existing = await this.getById(SETTINGS_DOC_ID);
      if (existing) return existing;
      return this.create(DEFAULTS);
    } catch (error) {
      wrapError('configuracoes.get', error);
    }
  },

  async update(
    idOrData: string | Partial<AppSettingsFormData> = SETTINGS_DOC_ID,
    maybeData?: Partial<AppSettingsFormData>
  ): Promise<AppSettings> {
    try {
      const data =
        typeof idOrData === 'string' ? (maybeData ?? {}) : idOrData;

      const current = (await this.getById(SETTINGS_DOC_ID)) ?? {
        id: SETTINGS_DOC_ID,
        ...DEFAULTS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const merged = {
        nome: data.nome ?? current.nome,
        descricao: data.descricao ?? current.descricao,
        email: data.email ?? current.email,
        telefone: data.telefone ?? current.telefone,
        endereco: data.endereco ?? current.endereco,
      };

      await setDoc(
        docRef(COLLECTIONS.configuracoes, SETTINGS_DOC_ID),
        {
          ...settingsToConfiguracao(merged),
          ...touchUpdated(),
          createdAt: timestamps().createdAt,
        },
        { merge: true }
      );

      const updated = await this.getById(SETTINGS_DOC_ID);
      if (!updated) throw new Error('Configurações não encontradas');

      await logsService.record({
        acao: 'update',
        colecao: COLLECTIONS.configuracoes,
        documentoId: SETTINGS_DOC_ID,
        descricao: 'Configurações atualizadas',
      });

      return updated;
    } catch (error) {
      wrapError('configuracoes.update', error);
    }
  },

  async delete(_id: string = SETTINGS_DOC_ID): Promise<void> {
    try {
      await setDoc(docRef(COLLECTIONS.configuracoes, SETTINGS_DOC_ID), {
        ...settingsToConfiguracao(DEFAULTS),
        ...timestamps(),
      });
      await logsService.record({
        acao: 'delete',
        colecao: COLLECTIONS.configuracoes,
        documentoId: SETTINGS_DOC_ID,
        descricao: 'Configurações resetadas',
      });
    } catch (error) {
      wrapError('configuracoes.delete', error);
    }
  },
};
