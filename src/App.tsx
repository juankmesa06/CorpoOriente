import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import MedicalRecord from "./pages/MedicalRecord";
import Settings from "./pages/Settings";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

import NotFound from "./pages/NotFound";
import PatientPayment from "./pages/PatientPayment";
import ResetPassword from "./pages/ResetPassword";
import SetupPassword from "./pages/SetupPassword";
import RentalSpaces from "./pages/RentalSpaces";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import ScrollToTop from "@/components/ScrollToTop";
import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { CookieConsent } from "@/components/CookieConsent";

const AppRoutes = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log("Password recovery event detected, navigating to reset-password");
        navigate('/auth/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <Routes>
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/" element={<Index />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-record"
        element={
          <ProtectedRoute>
            <MedicalRecord />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/:appointmentId"
        element={
          <ProtectedRoute>
            <PatientPayment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/spaces"
        element={
          <ProtectedRoute>
            <RentalSpaces />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route
        path="/auth/reset-password"
        element={
          <ProtectedRoute>
            <ResetPassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth/setup-password"
        element={
          <ProtectedRoute>
            <SetupPassword />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ScrollToTop />
          <SessionTimeout />
          <CookieConsent />
          <div className="flex flex-col min-h-screen">
            <div className="flex-1">
              <AppRoutes />
            </div>
            <Footer />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
