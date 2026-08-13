import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import { authService } from '../../services/auth.service';
import type { User, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  PageLoader,
} from '../../components/ui';
import { THEME } from '../../theme';
import { cn } from '../../lib/utils';
import { validateEmail } from '../../lib/validation';
import { isMasterAdminUser } from '../../config/masterAdmin';
import { StaffAvatar } from '../../components/admin/StaffAvatar';
import { useAdminPresence } from '../../contexts/AdminPresenceContext';
import { isStaffOnline } from '../../lib/presence';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  operador: 'Operador',
  viewer: 'Visitante',
};

type FormState = {
  name: string;
  email: string;
  role: UserRole;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  role: 'admin',
};

export default function Permissions() {
  const { user: currentUser } = useAuth();
  const { staff: liveStaff } = useAdminPresence();
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getAll();
      setItems(data);
    } catch {
      setError('Não foi possível carregar as permissões.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const merged = useMemo(() => {
    const byId = new Map(liveStaff.map((s) => [s.id, s]));
    return items.map((u) => {
      const live = byId.get(u.id);
      return live ? { ...u, ...live } : u;
    });
  }, [items, liveStaff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [merged, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
  };

  const closeModal = () => {
    setCreating(false);
    setFormError(null);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError('Informe o nome.');
      return;
    }
    if (!validateEmail(form.email.trim())) {
      setFormError('Informe um e-mail Google válido.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await authService.invite({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        ativo: true,
      });
      closeModal();
      await load();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Erro ao salvar permissão.'
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    if (currentUser?.id === deleteId) {
      setError('Você não pode remover a própria permissão.');
      setDeleteId(null);
      return;
    }
    const target = items.find((u) => u.id === deleteId);
    if (isMasterAdminUser(target)) {
      setError('O administrador master não pode ser removido.');
      setDeleteId(null);
      return;
    }
    setDeleting(true);
    try {
      await authService.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao remover permissão.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (u: User) => {
    if (currentUser?.id === u.id) {
      setError('Você não pode desativar a própria conta.');
      return;
    }
    if (isMasterAdminUser(u)) {
      setError('O administrador master não pode ser desativado.');
      return;
    }
    try {
      await authService.update(u.id, { ativo: !u.ativo });
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao atualizar status.'
      );
    }
  };

  if (loading) return <PageLoader label="Carregando permissões..." />;

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto min-w-0">
      <PageHeader
        title="Permissões"
        subtitle="Cadastre nome e e-mail Google para liberar acesso ao painel."
        actions={
          <Button className="rounded-2xl" onClick={openCreate}>
            <Plus size={18} aria-hidden="true" />
            Nova permissão
          </Button>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome ou e-mail..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Nenhuma permissão cadastrada"
          description="Adicione o e-mail Google de quem poderá acessar o painel."
          action={
            <Button className="rounded-2xl" onClick={openCreate}>
              <UserPlus size={18} />
              Cadastrar administrador
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((u, index) => (
            <motion.li
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: THEME.motion.duration,
                ease: THEME.motion.ease,
                delay: Math.min(index * 0.03, 0.2),
              }}
              className="card-surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <StaffAvatar
                  person={u}
                  size={44}
                  online={isStaffOnline(u)}
                />
                <div className="min-w-0">
                  <p className="font-black text-gray-900 truncate">{u.name}</p>
                  <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {isMasterAdminUser(u) && (
                      <Badge variant="info">Master</Badge>
                    )}
                    <Badge variant={u.ativo ? 'success' : 'neutral'}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="info">{ROLE_LABELS[u.role]}</Badge>
                    {isStaffOnline(u) ? (
                      <Badge variant="success">Online agora</Badge>
                    ) : null}
                    {u.pending ? (
                      <Badge variant="warning">Aguardando 1º login</Badge>
                    ) : (
                      <Badge variant="neutral">
                        {u.authProvider === 'google'
                          ? 'Google'
                          : u.authProvider === 'password'
                            ? 'Senha'
                            : 'Vinculado'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl h-9 text-xs"
                  onClick={() => void toggleActive(u)}
                  disabled={
                    currentUser?.id === u.id || isMasterAdminUser(u)
                  }
                >
                  {u.ativo ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="rounded-xl h-9 text-xs"
                  onClick={() => setDeleteId(u.id)}
                  disabled={
                    currentUser?.id === u.id || isMasterAdminUser(u)
                  }
                >
                  <Trash2 size={14} />
                  Remover
                </Button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={creating}
        onClose={closeModal}
        title="Nova permissão"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Informe o nome e o e-mail da conta Google. A pessoa entra no painel
            com &quot;Entrar com Google&quot;.
          </p>
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome completo"
            required
          />
          <Input
            label="E-mail Google"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="nome@gmail.com"
            required
          />
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Perfil
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as UserRole }))
              }
              className={cn(
                'w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'
              )}
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" className="rounded-xl" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl"
              isLoading={saving}
              onClick={() => void save()}
            >
              Salvar permissão
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Remover permissão?"
        description="Essa pessoa perderá o acesso ao painel administrativo."
        confirmLabel="Remover"
        isLoading={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
