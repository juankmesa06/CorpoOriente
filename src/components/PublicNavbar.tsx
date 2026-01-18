import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const PublicNavbar = () => {
    const { user } = useAuth();

    return (
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                    <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
                    <span className="text-xl font-bold tracking-tight text-primary">Centro <span className="text-slate-700">PsicoTerapeutico de Oriente</span></span>
                </Link>
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                    <Link to="/#services" className="hover:text-primary transition-colors">Servicios</Link>
                    <Link to="/#about" className="hover:text-primary transition-colors">Sobre Nosotros</Link>
                    <Link to="/#contact" className="hover:text-primary transition-colors">Contacto</Link>
                    {!user ? (
                        <>
                            <Link to="/auth">
                                <Button variant="outline" className="rounded-full px-6">Iniciar Sesión</Button>
                            </Link>
                            <Link to="/auth?mode=register">
                                <Button className="rounded-full px-6 shadow-lg shadow-primary/20">Agendar Cita</Button>
                            </Link>
                        </>
                    ) : (
                        <Link to="/dashboard">
                            <Button className="rounded-full px-8 shadow-lg shadow-primary/20">Ir al Dashboard</Button>
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
};
