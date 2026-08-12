import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-surface-muted flex flex-col overflow-x-hidden min-w-0">
      <Header />
      <main className="flex-grow min-w-0 pt-[115px]">
        <Suspense
          fallback={
            <ProcessingOverlay
              open
              label="Processando"
              detail="Carregando a próxima etapa..."
            />
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
