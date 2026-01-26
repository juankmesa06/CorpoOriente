import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Stethoscope } from "lucide-react";

export const PublicNavbar = () => {
    const { user } = useAuth();

    return (
        <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
            <div className="container mx-auto px-4 lg:px-6">
                <div className="flex items-center justify-between h-20">
                    {/* Logo and Brand */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 hover:opacity-90 transition-opacity group"
                    >
                        <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-lg lg:text-xl font-bold tracking-tight">
                                <span className="text-teal-600">Centro</span>{" "}
                                <span className="text-slate-800">PsicoTerapéutico</span>
                            </h1>
                            <p className="text-xs text-slate-500 font-medium -mt-0.5">de Oriente</p>
                        </div>
                        <div className="sm:hidden">
                            <h1 className="text-lg font-bold">
                                <span className="text-teal-600">CPTO</span>
                            </h1>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex items-center gap-2 lg:gap-6">
                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
                            <a
                                href="#services"
                                className="hover:text-teal-600 transition-colors relative group py-2"
                            >
                                Servicios
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-teal-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                            <a
                                href="#about"
                                className="hover:text-teal-600 transition-colors relative group py-2"
                            >
                                Sobre Nosotros
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-teal-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                            <a
                                href="#contact"
                                className="hover:text-teal-600 transition-colors relative group py-2"
                            >
                                Contacto
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-teal-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                        </div>

                        {/* Auth Buttons */}
                        {!user ? (
                            <div className="flex items-center gap-2 lg:gap-3">
                                <Link to="/auth">
                                    <Button
                                        variant="ghost"
                                        className="rounded-full px-4 lg:px-6 text-sm font-semibold text-slate-700 hover:text-teal-600 hover:bg-teal-50"
                                    >
                                        Iniciar Sesión
                                    </Button>
                                </Link>
                                <Link to="/auth?mode=register">
                                    <Button
                                        className="rounded-full px-4 lg:px-6 text-sm font-semibold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 transition-all text-white"
                                    >
                                        Agendar Cita
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <Link to="/dashboard">
                                <Button
                                    className="rounded-full px-6 lg:px-8 text-sm font-semibold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 transition-all text-white"
                                >
                                    Ir al Dashboard
                                </Button>
                            </Link>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
};
