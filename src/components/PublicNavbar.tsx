import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Stethoscope, Menu, X } from "lucide-react";
import { useState } from "react";

export const PublicNavbar = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path: string) => location.hash === path;

    const navLinks = [
        { name: 'Servicios', href: '#services' },
        { name: 'Sobre Nosotros', href: '#about' },
        { name: 'Contacto', href: '#contact' }
    ];

    return (
        <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm h-20 transition-all duration-300">
            <div className="container mx-auto px-4 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo and Brand */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 hover:opacity-90 transition-all group"
                    >
                        <img
                            src="/logo.png"
                            alt="Centro Psicoterapéutico de Oriente"
                            className="h-10 md:h-12 w-auto object-contain"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-2 lg:gap-8">
                        {/* Desktop Menu */}
                        <div className="flex items-center gap-1">
                            {navLinks.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    className={`
                                        px-4 lg:px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                                        ${isActive(item.href)
                                            ? 'text-teal-700 bg-teal-50'
                                            : 'text-slate-600 hover:text-teal-700 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    {item.name}
                                </a>
                            ))}
                        </div>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 ml-4">
                            {!user ? (
                                <>
                                    <Link to="/auth">
                                        <Button
                                            variant="ghost"
                                            className="rounded-full px-5 font-semibold text-slate-600 hover:text-teal-700 hover:bg-teal-50"
                                        >
                                            Iniciar Sesión
                                        </Button>
                                    </Link>
                                    <Link to="/auth?mode=register">
                                        <Button
                                            className="rounded-full px-6 font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 hover:shadow-lg transition-all"
                                        >
                                            Agendar Cita
                                        </Button>
                                    </Link>
                                </>
                            ) : (
                                <Link to="/dashboard">
                                    <Button
                                        className="rounded-full px-6 font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 hover:shadow-lg transition-all"
                                    >
                                        Ir al Panel Principal
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </nav>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-slate-600 hover:text-teal-600 hover:bg-slate-50 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-200 shadow-xl animate-in slide-in-from-top-2">
                    <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
                        {navLinks.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                                    px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 block
                                    ${isActive(item.href)
                                        ? 'text-teal-700 bg-teal-50'
                                        : 'text-slate-600 hover:text-teal-700 hover:bg-slate-50'
                                    }
                                `}
                            >
                                {item.name}
                            </a>
                        ))}
                        <div className="h-px bg-slate-100 my-2" />
                        {!user ? (
                            <div className="flex flex-col gap-3">
                                <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-xl h-12 font-semibold text-slate-600 border-slate-200"
                                    >
                                        Iniciar Sesión
                                    </Button>
                                </Link>
                                <Link to="/auth?mode=register" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button
                                        className="w-full rounded-xl h-12 font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20"
                                    >
                                        Agendar Cita
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                                <Button
                                    className="w-full rounded-xl h-12 font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20"
                                >
                                    Ir al Panel Principal
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};
