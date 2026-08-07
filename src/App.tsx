import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { ROUTES } from './config';
import { Spinner } from './components/ui/Spinner';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import { PWAInstall } from './components/common/PWAInstall';

const Home = lazy(() => import('./pages/public/Home'));
const EventDetails = lazy(() => import('./pages/public/EventDetails'));
const EventRegistration = lazy(() => import('./pages/public/EventRegistration'));

const Login = lazy(() => import('./pages/admin/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Events = lazy(() => import('./pages/admin/Events'));
const EventForm = lazy(() => import('./pages/admin/EventForm'));
const EventReports = lazy(() => import('./pages/admin/EventReports'));
const CheckIn = lazy(() => import('./pages/admin/CheckIn'));
const PurchaseDetails = lazy(() => import('./pages/admin/PurchaseDetails'));
const Sponsors = lazy(() => import('./pages/admin/Sponsors'));
const Institutions = lazy(() => import('./pages/admin/Institutions'));
const Permissions = lazy(() => import('./pages/admin/Permissions'));
const Health = lazy(() => import('./pages/admin/Health'));

const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface-muted">
    <Spinner size="lg" label="Carregando DELPHOS" />
    <p className="text-sm font-medium text-gray-400">Carregando...</p>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <PWAInstall />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path={ROUTES.PUBLIC.HOME} element={<Home />} />
              <Route path={ROUTES.PUBLIC.EVENT_DETAILS} element={<EventDetails />} />
              <Route path={ROUTES.PUBLIC.EVENT_REGISTRATION} element={<EventRegistration />} />
            </Route>

            <Route path={ROUTES.ADMIN.LOGIN} element={<Login />} />

            <Route
              path="/controle"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to={ROUTES.ADMIN.DASHBOARD} replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="eventos" element={<Events />} />
              <Route path="eventos/novo" element={<EventForm />} />
              <Route path="eventos/editar/:id" element={<EventForm />} />
              <Route path="eventos/relatorios/:id" element={<EventReports />} />
              <Route path="eventos/checkin/:id" element={<CheckIn />} />
              <Route path="compras/:id" element={<PurchaseDetails />} />
              <Route path="patrocinadores" element={<Sponsors />} />
              <Route path="instituicoes" element={<Institutions />} />
              <Route path="permissoes" element={<Permissions />} />
              <Route path="health" element={<Health />} />
            </Route>

            {/* Alias oculto solicitado: /admin/health */}
            <Route
              path="/admin/health"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Health />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
