import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { PwaInstallPrompt } from '../components/common/PwaInstallPrompt';
import { PushEnablePrompt } from '../components/common/PushEnablePrompt';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';
import { PublicErrorBoundary } from '../components/public/PublicErrorBoundary';
import { useInstalledAppPing } from '../lib/appInstallPing';
import { usePublicSiteVisitPing } from '../lib/siteVisitPing';
import { useMpDeviceId } from '../lib/useMpDeviceId';

export default function PublicLayout() {
  useInstalledAppPing();
  usePublicSiteVisitPing();
  useMpDeviceId();

  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // No PWA o scroll fica neste container — resetar ao trocar de rota.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    else window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return (
    <div className="public-shell">
      <Header />
      <div ref={scrollRef} className="public-shell-scroll" id="public-scroll">
        <main className="min-w-0">
          <PublicErrorBoundary>
            <Suspense
              fallback={
                <div className="min-h-[50vh] relative">
                  <ProcessingOverlay
                    open
                    label="Processando"
                    detail="Carregando a próxima etapa..."
                  />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </PublicErrorBoundary>
        </main>
        <Footer />
        {/* Em fluxo: não cobre o rodapé nem trava o scroll no app instalado */}
        <PushEnablePrompt />
      </div>
      <PwaInstallPrompt />
      <input type="hidden" id="deviceId" name="deviceId" readOnly />
    </div>
  );
}
