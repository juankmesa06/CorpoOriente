import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            // Show banner after a short delay
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookie-consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 p-4 m-4 md:m-6 mx-auto max-w-4xl",
            "bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-2xl shadow-2xl border border-slate-700/50",
            "transform transition-all duration-500 ease-in-out animate-in slide-in-from-bottom-10 fade-in"
        )}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                <div className="bg-teal-500/10 p-3 rounded-full shrink-0">
                    <Cookie className="h-6 w-6 text-teal-400" />
                </div>

                <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-base md:text-lg">🍪 Uso de Cookies</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar nuestro tráfico y personalizar el contenido.
                        Puedes consultar nuestra <Link to="/privacy" className="text-teal-400 hover:text-teal-300 underline underline-offset-2">Política de Privacidad</Link>.
                    </p>
                </div>

                <div className="flex flex-row gap-3 w-full md:w-auto shrink-0 justify-end md:justify-start pt-2 md:pt-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDecline}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        Rechazar
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleAccept}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-lg shadow-teal-900/20"
                    >
                        Aceptar Todas
                    </Button>
                </div>
            </div>
        </div>
    );
};
