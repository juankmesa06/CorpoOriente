import { Link } from "react-router-dom";

export const Footer = () => {
    return (
        <footer className="py-12 border-t border-slate-200 mt-12 bg-white">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-slate-500">
                <div className="flex items-center gap-2 grayscale brightness-50">
                    <img src="/logo.png" alt="Logo" className="h-6 w-6" />
                    <span className="font-bold text-slate-900">Centro PsicoTerapeutico de Oriente</span>
                </div>
                <div className="flex gap-8">
                    <a href="#" className="hover:text-primary transition-colors">Privacidad</a>
                    <a href="#" className="hover:text-primary transition-colors">Términos</a>
                    <a href="#" className="hover:text-primary transition-colors">Cookies</a>
                </div>
                <p>© 2026 Centro PsicoTerapeutico de Oriente. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
};
