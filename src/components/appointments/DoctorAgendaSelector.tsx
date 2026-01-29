import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAppointments } from '@/hooks/useAppointments';
import { Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DoctorAgendaSelectorProps {
    doctorId: string;
    isOpen: boolean;
    onClose: () => void;
    onSelectSlot: (date: string) => void;
}

export const DoctorAgendaSelector = ({ doctorId, isOpen, onClose, onSelectSlot }: DoctorAgendaSelectorProps) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const { loading, slots, getAvailability } = useAppointments();

    useEffect(() => {
        if (isOpen && selectedDate && doctorId) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            getAvailability(doctorId, dateStr);
            setSelectedSlot(null);
        }
    }, [isOpen, selectedDate, doctorId]);

    const handleConfirm = () => {
        if (selectedSlot) {
            onSelectSlot(selectedSlot);
            onClose();
        } else {
            toast.error("Por favor selecciona un horario disponible");
        }
    };

    const formatSlotTime = (isoString: string) => {
        return format(new Date(isoString), 'HH:mm', { locale: es });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-teal-600" />
                        Seleccionar Horario en Agenda
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Date Picker */}
                    <div className="flex justify-center border rounded-lg p-2 bg-slate-50">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date.getDay() === 0}
                            className="rounded-md"
                            locale={es}
                        />
                    </div>

                    {/* Slots Grid */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Horarios Disponibles
                        </h4>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                            </div>
                        ) : slots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
                                {slots.map((slot) => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={cn(
                                            "px-2 py-2 text-xs font-semibold rounded-md border transition-all",
                                            selectedSlot === slot
                                                ? "bg-teal-600 text-white border-teal-600 shadow-md"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:bg-teal-50"
                                        )}
                                    >
                                        {formatSlotTime(slot)}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <p className="text-sm">No hay horarios disponibles para esta fecha.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={!selectedSlot} className="bg-teal-600 hover:bg-teal-700">
                        Confirmar Selección
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
