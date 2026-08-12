import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';
import { PublicErrorBoundary } from '../components/public/PublicErrorBoundary';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-surface-muted flex flex-col overflow-x-hidden min-w-0">
      <Header />
      <main className="flex-grow min-w-0 pt-[115px]">
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
    </div>
  );
}
