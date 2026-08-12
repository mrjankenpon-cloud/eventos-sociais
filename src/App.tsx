import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { ROUTES } from './config';
import { ProcessingOverlay } from './components/ui/ProcessingOverlay';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import { PWAInstall } from './components/common/PWAInstall';

/** Funil público: eager para evitar tela em branco no 1º clique (Suspense/lazy). */
import Home from './pages/public/Home';
import EventDetails from './pages/public/EventDetails';
import EventRegistration from './pages/public/EventRegistration';

const OrderSuccess = lazy(() => import('./pages/public/OrderSuccess'));
const OrderLookup = lazy(() => import('./pages/public/OrderLookup'));
const MyTickets = lazy(() => import('./pages/public/MyTickets'));

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

function RouteFallback({ detail }: { detail?: string }) {
  return (
    <div className="min-h-[50vh]">
      <ProcessingOverlay
        open
        label="Processando"
        detail={detail || 'Carregando a próxima etapa...'}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PWAInstall />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path={ROUTES.PUBLIC.HOME} element={<Home />} />
            <Route path={ROUTES.PUBLIC.EVENT_DETAILS} element={<EventDetails />} />
            <Route
              path={ROUTES.PUBLIC.EVENT_REGISTRATION}
              element={<EventRegistration />}
            />
            <Route path={ROUTES.PUBLIC.ORDER_SUCCESS} element={<OrderSuccess />} />
            <Route path={ROUTES.PUBLIC.ORDER_LOOKUP} element={<OrderLookup />} />
            <Route path={ROUTES.PUBLIC.MY_TICKETS} element={<MyTickets />} />
          </Route>

          <Route
            path={ROUTES.ADMIN.LOGIN}
            element={
              <Suspense
                fallback={
                  <RouteFallback detail="Abrindo acesso ao controle..." />
                }
              >
                <Login />
              </Suspense>
            }
          />

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
      </BrowserRouter>
    </AuthProvider>
  );
}
