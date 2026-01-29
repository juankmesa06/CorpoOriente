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
        // En Supabase, el evento de recuperación de contraseña inicia sesión al usuario.
        // Solo redirigimos al dashboard si NO es una sesión de recuperación.
        const isRecovery = window.location.href.includes('type=recovery') ||
            window.location.hash.includes('type=recovery');

        if (!isRecovery) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}
