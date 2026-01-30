import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface PublicRouteProps {
    children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (user) {
        // Check for special auth events that should not redirect to dashboard
        const isRecovery = window.location.href.includes('type=recovery') ||
            window.location.hash.includes('type=recovery');
        
        // Check for invitation tokens (type=invite or type=signup from Supabase)
        const isInvite = window.location.href.includes('type=invite') ||
            window.location.hash.includes('type=invite') ||
            window.location.href.includes('type=signup') ||
            window.location.hash.includes('type=signup');

        // Check if user needs to set up their password
        const setupRequired = user.user_metadata?.setup_required === true;
        const userRole = user.user_metadata?.role;
        const isStaffMember = ['admin', 'receptionist', 'doctor'].includes(userRole);

        // If user needs setup and is staff, redirect to setup page
        if (setupRequired && isStaffMember) {
            return <Navigate to="/auth/setup-password" replace />;
        }

        // Don't redirect to dashboard if this is a recovery or invite session
        if (!isRecovery && !isInvite) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}
