import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const CurrentDateTime = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000); // Update every second

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-600" />
                <span className="font-medium capitalize">
                    {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
            </div>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                <span className="font-mono font-medium">
                    {format(currentTime, 'HH:mm:ss')}
                </span>
            </div>
        </div>
    );
};
