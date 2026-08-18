import { useState, useEffect, Suspense } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Calendar,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Handshake,
  HeartHandshake,
  Shield,
  FileText,
  Video,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useInstalledAppPing } from '../lib/appInstallPing';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES, APP_CONFIG } from '../config';
import { isMasterAdminUser } from '../config/masterAdmin';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';
import { StaffAvatar } from '../components/admin/StaffAvatar';
import { AdminPresenceProvider, useAdminPresence } from '../contexts/AdminPresenceContext';

export default function AdminLayout() {
  return (
    <AdminPresenceProvider>
      <AdminShell />
    </AdminPresenceProvider>
  );
}

function AdminShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { onlineStaff, staff } = useAdminPresence();
  useInstalledAppPing();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsSidebarOpen(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: ROUTES.ADMIN.DASHBOARD },
    { name: 'Eventos', icon: Calendar, href: ROUTES.ADMIN.EVENTS },
    { name: 'Patrocinadores', icon: Handshake, href: ROUTES.ADMIN.SPONSORS },
    { name: 'Instituições', icon: HeartHandshake, href: ROUTES.ADMIN.INSTITUTIONS },
    { name: 'Vídeos', icon: Video, href: ROUTES.ADMIN.VIDEOS },
    { name: 'Conteúdo', icon: FileText, href: ROUTES.ADMIN.SITE_CONTENT },
    { name: 'Permissões', icon: Shield, href: ROUTES.ADMIN.PERMISSIONS },
  ];

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.ADMIN.LOGIN);
  };

  const live = staff.find((s) => s.id === user?.id);
  const displayName = live?.name || user?.name || 'Admin Controle';
  const avatar = live?.avatar || user?.avatar;

  return (
    <div className="min-h-screen bg-surface-admin flex overflow-x-hidden min-w-0">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'bg-brand-deeper transition-all duration-300 fixed md:sticky inset-y-0 left-0 z-50 h-screen flex flex-col',
          isSidebarOpen
            ? 'w-64 translate-x-0'
            : 'w-20 -translate-x-full md:translate-x-0'
        )}
      >
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
          <Link
            to={ROUTES.ADMIN.DASHBOARD}
            className={cn('flex items-center gap-2', !isSidebarOpen && 'justify-center w-full')}
            aria-label={APP_CONFIG.name}
          >
            {isSidebarOpen ? (
              <span className="font-black text-white text-xl tracking-widest">
                DELPHOS
              </span>
            ) : (
              <span className="font-black text-white text-xl">D</span>
            )}
          </Link>
          <button
            type="button"
            className="md:hidden p-2 text-white/60 hover:text-white rounded-lg"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="p-3 space-y-1 mt-2 flex-1" aria-label="Menu administrativo">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                title={item.name}
                onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
                  !isSidebarOpen && 'justify-center',
                  isActive
                    ? 'bg-brand text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon size={20} className="shrink-0" aria-hidden="true" />
                {isSidebarOpen && (
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {item.name}
                  </span>
                )}
                {!isSidebarOpen && <span className="sr-only">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 space-y-1 pb-6 shrink-0">
          <Link
            to={ROUTES.PUBLIC.HOME}
            title="Ver site público"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all',
              !isSidebarOpen && 'justify-center'
            )}
          >
            <ArrowLeft size={20} className="shrink-0" aria-hidden="true" />
            {isSidebarOpen && (
              <span className="font-medium text-sm">Ver Site Público</span>
            )}
            {!isSidebarOpen && <span className="sr-only">Ver site público</span>}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all',
              !isSidebarOpen && 'justify-center'
            )}
          >
            <LogOut size={20} className="shrink-0" aria-hidden="true" />
            {isSidebarOpen && <span className="font-medium text-sm">Sair</span>}
            {!isSidebarOpen && <span className="sr-only">Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-grow flex flex-col min-h-screen min-w-0">
        <header className="h-14 sm:h-20 bg-white border-b border-gray-100 px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-30 min-w-0">
          <button
            type="button"
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            onClick={() => setIsSidebarOpen((v) => !v)}
            aria-label={isSidebarOpen ? 'Recolher menu' : 'Abrir menu'}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-gray-50 border border-gray-100 pl-1.5 pr-2 py-1 max-w-[46vw] sm:max-w-none min-w-0"
              title={
                onlineStaff.length
                  ? onlineStaff.map((s) => s.name).join(', ')
                  : 'Nenhum outro acesso no momento'
              }
            >
              <span className="flex -space-x-2">
                {onlineStaff.slice(0, 4).map((s) => (
                  <StaffAvatar
                    key={s.id}
                    person={s}
                    size={22}
                    online
                    ringClassName="ring-gray-50"
                  />
                ))}
              </span>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-500 whitespace-nowrap truncate">
                {onlineStaff.length}{' '}
                <span className="hidden sm:inline">
                  {onlineStaff.length === 1
                    ? 'administrador online'
                    : 'administradores online'}
                </span>
                <span className="sm:hidden">online</span>
              </span>
            </div>

            <div className="text-right hidden sm:block min-w-0">
              <p className="text-sm font-bold truncate">{displayName}</p>
              <p className="text-xs text-gray-400">
                {isMasterAdminUser(user)
                  ? 'Administrador Master'
                  : user?.role === 'admin'
                    ? 'Administrador'
                    : user?.role === 'editor'
                      ? 'Editor'
                      : user?.role === 'operador'
                        ? 'Operador'
                        : 'Acesso'}
              </p>
            </div>
            <StaffAvatar
              person={{ name: displayName, avatar }}
              size={36}
              online
            />
          </div>
        </header>

        <main className="flex-grow p-3 sm:p-6 lg:p-8 min-w-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Suspense
            fallback={
              <ProcessingOverlay
                open
                label="Processando"
                detail="Carregando o painel..."
              />
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
