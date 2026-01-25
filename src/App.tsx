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
import NotFound from "./pages/NotFound";
import PatientPayment from "./pages/PatientPayment";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";

const AppRoutes = () => (
  <Routes>
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
      path="/auth"
      element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
