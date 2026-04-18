// ============================================================
// SWAN · HUB — Application principale
// Point d'entrée des routes, providers, guards
// ============================================================

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { lazy, Suspense } from 'react';

import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingScreen } from '@/components/LoadingScreen';

// ── Pages chargées immédiatement (critique) ──────────────────
import Home from '@/pages/Home';
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';

// ── Pages chargées à la demande (lazy) ───────────────────────
const Plugins           = lazy(() => import('@/pages/Plugins'));
const Dashboard         = lazy(() => import('@/pages/Dashboard'));
const Profile           = lazy(() => import('@/pages/Profile'));
const Admin             = lazy(() => import('@/pages/Admin'));
const Pricing           = lazy(() => import('@/pages/Pricing'));
const Security          = lazy(() => import('@/pages/Security'));
const Notifications     = lazy(() => import('@/pages/Notifications'));
const ForgotPassword    = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword     = lazy(() => import('@/pages/auth/ResetPassword'));
const UnlockAccount     = lazy(() => import('@/pages/auth/UnlockAccount'));
const Onboarding        = lazy(() => import('@/pages/Onboarding'));

// Plugins
const ReportPlugin      = lazy(() => import('@/pages/plugins/ReportPlugin'));
const TasksPlugin       = lazy(() => import('@/pages/plugins/TasksPlugin'));
const MissionsPlugin    = lazy(() => import('@/pages/plugins/MissionsPlugin'));
const QuotesPlugin      = lazy(() => import('@/pages/plugins/QuotesPlugin'));
const LogbookPlugin     = lazy(() => import('@/pages/plugins/LogbookPlugin'));
const VehiclePlugin     = lazy(() => import('@/pages/plugins/VehiclePlugin'));

const NotFound          = lazy(() => import('@/pages/NotFound'));
const Legal             = lazy(() => import('@/pages/Legal'));

// ── Configuration React Query ────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Guards ───────────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ── Onboarding Guard ─ Force le choix métier + code anti-phishing ──
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  // Si le profil n'a pas de code anti-phishing défini → onboarding
  if (profile && !profile.anti_phishing_code) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

// ── App ──────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-1)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
            },
          }}
        />

        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* ─── Routes publiques ─────────────────────── */}
              <Route path="/login"           element={<GuestOnly><Login /></GuestOnly>} />
              <Route path="/signup"          element={<GuestOnly><Signup /></GuestOnly>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />
              <Route path="/unlock"          element={<UnlockAccount />} />
              <Route path="/legal/:type"     element={<Legal />} />
              <Route path="/security"        element={<Security />} />

              {/* ─── Onboarding (obligatoire après signup) ── */}
              <Route
                path="/onboarding"
                element={
                  <AuthGuard>
                    <Onboarding />
                  </AuthGuard>
                }
              />

              {/* ─── Routes authentifiées ─────────────────── */}
              <Route
                element={
                  <AuthGuard>
                    <OnboardingGuard>
                      <AppLayout />
                    </OnboardingGuard>
                  </AuthGuard>
                }
              >
                <Route path="/"                    element={<Home />} />
                <Route path="/plugins"             element={<Plugins />} />
                <Route path="/dashboard"           element={<Dashboard />} />
                <Route path="/profile"             element={<Profile />} />
                <Route path="/pricing"             element={<Pricing />} />
                <Route path="/notifications"       element={<Notifications />} />

                {/* Plugins */}
                <Route path="/plugins/report"      element={<ReportPlugin />} />
                <Route path="/plugins/tasks"       element={<TasksPlugin />} />
                <Route path="/plugins/missions"    element={<MissionsPlugin />} />
                <Route path="/plugins/quotes"      element={<QuotesPlugin />} />
                <Route path="/plugins/logbook"     element={<LogbookPlugin />} />
                <Route path="/plugins/vehicle"     element={<VehiclePlugin />} />
              </Route>

              {/* ─── Routes admin ─────────────────────────── */}
              <Route
                path="/admin/*"
                element={
                  <AdminGuard>
                    <AppLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<Admin />} />
              </Route>

              {/* ─── 404 ──────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
