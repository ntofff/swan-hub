import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard, AdminGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import Home from "./pages/Home";
import Plugins from "./pages/Plugins";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Admin from "./pages/Admin";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AccessDenied from "./pages/AccessDenied";
import ReportPlugin from "./pages/plugins/ReportPlugin";
import LogbookPlugin from "./pages/plugins/LogbookPlugin";
import TasksPlugin from "./pages/plugins/TasksPlugin";
import MissionsPlugin from "./pages/plugins/MissionsPlugin";
import QuotesPlugin from "./pages/plugins/QuotesPlugin";
import VehiclePlugin from "./pages/plugins/VehiclePlugin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/about" element={<AppLayout />}>
              <Route index element={<About />} />
            </Route>

            {/* Authenticated */}
            <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
              <Route path="/" element={<Home />} />
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/plugins/report" element={<ReportPlugin />} />
              <Route path="/plugins/logbook" element={<LogbookPlugin />} />
              <Route path="/plugins/tasks" element={<TasksPlugin />} />
              <Route path="/plugins/missions" element={<MissionsPlugin />} />
              <Route path="/plugins/quotes" element={<QuotesPlugin />} />
              <Route path="/plugins/vehicle" element={<VehiclePlugin />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin */}
            <Route element={<AdminGuard><AppLayout /></AdminGuard>}>
              <Route path="/hub-admin-console" element={<Admin />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
