import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types/models/user';
import { usuariosService } from '../services/firebase/usuarios';
import { PRESENCE_HEARTBEAT_MS, isStaffOnline } from '../lib/presence';
import { useAuth } from './AuthContext';

type AdminPresenceValue = {
  staff: User[];
  onlineStaff: User[];
};

const AdminPresenceContext = createContext<AdminPresenceValue>({
  staff: [],
  onlineStaff: [],
});

export function AdminPresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user) {
      setStaff([]);
      return;
    }

    const unsub = usuariosService.subscribeStaff(setStaff);
    void usuariosService.heartbeat();
    const tick = window.setInterval(() => {
      void usuariosService.heartbeat();
      setNow(Date.now());
    }, PRESENCE_HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void usuariosService.heartbeat();
        setNow(Date.now());
      }
    };
    const onLeave = () => {
      void usuariosService.markOffline();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onLeave);

    return () => {
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onLeave);
      unsub();
      void usuariosService.markOffline();
    };
  }, [user?.id]);

  const value = useMemo<AdminPresenceValue>(
    () => ({
      staff,
      onlineStaff: staff.filter((row) => isStaffOnline(row, now)),
    }),
    [staff, now]
  );

  return (
    <AdminPresenceContext.Provider value={value}>
      {children}
    </AdminPresenceContext.Provider>
  );
}

export function useAdminPresence() {
  return useContext(AdminPresenceContext);
}
