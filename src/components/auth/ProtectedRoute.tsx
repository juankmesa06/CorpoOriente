import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    // Check if user needs to set up their password (invited users)
    const setupRequired = user.user_metadata?.setup_required === true;
    const isOnSetupPage = location.pathname === '/auth/setup-password';
    const isOnResetPage = location.pathname === '/auth/reset-password';
    
    // Get user role - admin, receptionist, doctor need setup, patients don't
    const userRole = user.user_metadata?.role;
    const isStaffMember = ['admin', 'receptionist', 'doctor'].includes(userRole);

    // If user needs setup and is staff (not patient), redirect to setup page
    // Unless they're already on the setup or reset page
    if (setupRequired && isStaffMember && !isOnSetupPage && !isOnResetPage) {
        return <Navigate to="/auth/setup-password" replace />;
    }

    return <>{children}</>;
}
