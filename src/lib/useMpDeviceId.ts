import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ensureMpSecurityScript, mpViewFromPath } from './mpDeviceId';

/** Coleta o Device ID do Mercado Pago nas páginas públicas. */
export function useMpDeviceId() {
  const { pathname } = useLocation();

  useEffect(() => {
    ensureMpSecurityScript(mpViewFromPath(pathname));
  }, [pathname]);
}
