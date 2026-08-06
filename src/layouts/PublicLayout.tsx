import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-surface-muted flex flex-col overflow-x-hidden min-w-0">
      <Header />
      <main className="flex-grow min-w-0 pt-[115px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
