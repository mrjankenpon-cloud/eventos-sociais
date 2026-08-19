import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col overflow-x-hidden min-w-0">
      <Header />
      <main className="flex-grow min-w-0 pt-[calc(var(--header-height)+env(safe-area-inset-top))]">
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
      <PwaInstallPrompt />
      <PushEnablePrompt />
      <input type="hidden" id="deviceId" name="deviceId" readOnly />
    </div>
  );
}
