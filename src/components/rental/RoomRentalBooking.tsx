import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Building2, Video, Users, CheckCircle, XCircle, Clock, DollarSign, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RoomRentalInsert {
    room_id: string;
    user_id: string | null;
    renter_name: string;
    renter_email: string;
    renter_phone: string;
    start_time: string;
    end_time: string;
    purpose: string;
    hourly_rate: number;
    total_price: number;
    status: 'confirmed' | 'pending' | 'cancelled';
    appointment_id: string | null;
}

interface Room {
    id: string;
    name: string;
    description: string | null;
    room_type: 'consultation' | 'event_hall' | 'virtual' | 'event' | 'physical';
    capacity: number;
    is_active: boolean;
    price_per_hour: number;
}

interface TimeSlot {
    hour: number;
    available: boolean;
}

interface AppointmentForRental {
    id: string;
    patient_name: string;
    start_time: string;
    end_time: string;
}

interface RoomRentalBookingProps {
    appointment?: AppointmentForRental;
    onSuccess?: () => void;
}

export const RoomRentalBooking = ({ appointment, onSuccess }: RoomRentalBookingProps) => {
    const { user, hasRole } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [checkingAvailability, setCheckingAvailability] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        renter_name: '',
        renter_email: user?.email || '',
        renter_phone: '',
        start_hour: '09:00',
        duration_hours: 1,
        purpose: ''
    });

    const [showPayment, setShowPayment] = useState(false);
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvc: '',
        name: ''
    });

    useEffect(() => {
        loadRooms();
    }, []);

    useEffect(() => {
        if (appointment) {
            const startDate = new Date(appointment.start_time);
            setSelectedDate(startDate);

            const hours = startDate.getHours();
            const minutes = startDate.getMinutes();
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            setFormData(prev => ({
                ...prev,
                renter_name: `Dr. ${user?.email?.split('@')[0] || ''}`, // Self-fill doctor name
                purpose: `Consulta con ${appointment.patient_name}`,
                start_hour: timeString,
                duration_hours: 1 // Default to 1, or calculate from end_time
            }));
        } else {
            // Basic prefill for independent rental
            setFormData(prev => ({
                ...prev,
                renter_name: `Dr. ${user?.email?.split('@')[0] || ''}`,
                renter_email: user?.email || ''
            }));
        }
    }, [appointment, user]);

    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ ...prev, renter_email: user.email || '' }));
        }
    }, [user]);

    useEffect(() => {
        if (selectedRoom && selectedDate) {
            checkAvailability();
        }
    }, [selectedRoom, selectedDate]);

    const loadRooms = async () => {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('is_active', true)
            .order('room_type', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            toast.error('Error al cargar espacios');
        } else {
            // Filtrar y castear
            let filteredRooms = (data as any[] || []) as Room[];

            if (hasRole('patient')) {
                // Pacientes solo ven salones de eventos
                filteredRooms = filteredRooms.filter(room => room.room_type === 'event_hall' || room.room_type === 'event');
            } else if (hasRole('doctor') || hasRole('receptionist')) {
                // Médicos y recepcionistas ven TODO
                filteredRooms = filteredRooms;
            } else {
                // Otros roles no pueden alquilar
                filteredRooms = [];
            }

            setRooms(filteredRooms);
        }
    };

    const checkAvailability = async () => {
        if (!selectedRoom || !selectedDate) return;

        setCheckingAvailability(true);

        // Generar horarios de 7 AM a 7 PM
        const slots: TimeSlot[] = [];
        for (let hour = 7; hour <= 19; hour++) {
            slots.push({ hour, available: true });
        }

        // Obtener reservas existentes para este día y espacio
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Explicit typing for query results
        const { data: rentals } = await supabase
            .from('room_rentals' as any)
            .select('start_time, end_time')
            .eq('room_id', selectedRoom.id)
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfDay.toISOString())
            .neq('status', 'cancelled');

        const { data: appointments } = await supabase
            .from('appointments')
            .select('start_time, end_time')
            .eq('room_id', selectedRoom.id)
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfDay.toISOString())
            .not('status', 'in', '(cancelled,no_show)');

        // Marcar horarios ocupados
        const allBookings: { start_time: string; end_time: string }[] = [
            ...(rentals || []).map((r: any) => ({ start_time: r.start_time, end_time: r.end_time })),
            ...(appointments || []).map((a: any) => ({ start_time: a.start_time, end_time: a.end_time }))
        ];

        allBookings.forEach(booking => {
            const startHour = new Date(booking.start_time).getHours();
            const endHour = new Date(booking.end_time).getHours();

            slots.forEach(slot => {
                if (slot.hour >= startHour && slot.hour < endHour) {
                    slot.available = false;
                }
            });
        });

        setAvailableSlots(slots);
        setCheckingAvailability(false);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
        setFormData({ ...formData, renter_phone: value });
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRoom || !selectedDate) {
            toast.error('Selecciona un espacio y una fecha');
            return;
        }

        if (!formData.renter_name || !formData.renter_email) {
            toast.error('Completa todos los campos obligatorios');
            return;
        }

        // Verificar disponibilidad simple
        const [hours] = formData.start_hour.split(':').map(Number);
        const selectedSlot = availableSlots.find(s => s.hour === hours);
        if (!selectedSlot?.available) {
            toast.error('Este horario no está disponible. Por favor selecciona otro.');
            return;
        }

        setShowPayment(true);
    };

    const handlePaymentAndBooking = async () => {
        // Card validation skipped as per request

        setLoading(true);

        // Simular proceso de pago
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Calcular tiempos
        const [hours, minutes] = formData.start_hour.split(':').map(Number);
        const startTime = new Date(selectedDate!);
        startTime.setHours(hours, minutes, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + formData.duration_hours);

        // Crear reserva pagada
        const rentalPayload: RoomRentalInsert = {
            room_id: selectedRoom!.id,
            user_id: user?.id || null,
            renter_name: formData.renter_name,
            renter_email: formData.renter_email,
            renter_phone: `+57${formData.renter_phone}`,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            purpose: formData.purpose,
            hourly_rate: selectedRoom!.price_per_hour || 50000,
            total_price: (selectedRoom!.price_per_hour || 50000) * formData.duration_hours,
            status: 'confirmed', // Confirmado porque ya pagó
            appointment_id: appointment?.id || null // Link to appointment
        };

        const { data: rentalData, error } = await supabase
            .from('room_rentals' as any)
            .insert([rentalPayload])
            .select()
            .single();

        setLoading(false);
        setShowPayment(false);

        if (error || !rentalData) {
            console.error('Error creating rental:', error);
            toast.error('Error al procesar la reserva. El pago será reversado.');
        } else {
            const confirmedRental = rentalData as { id: string }; // Type assertion

            toast.success('¡Pago exitoso y reserva confirmada!');

            // If linked to an appointment, update the appointment with rental_id
            if (appointment && confirmedRental) {
                const { error: aptError } = await supabase
                    .from('appointments')
                    .update({
                        rental_id: confirmedRental.id,
                        room_id: selectedRoom!.id,
                        location_confirmed: true
                    })
                    .eq('id', appointment.id);

                if (aptError) {
                    console.error('Error linking appointment:', aptError);
                    toast.error('Reserva creada, pero hubo un error actualizando la cita.');
                } else {
                    // Trigger notification
                    supabase.functions.invoke('notify-patient', {
                        body: { appointment_id: appointment.id, rental_id: confirmedRental.id }
                    }).then(({ error }) => {
                        if (!error) toast.success('Notificación enviada al paciente');
                    });
                }
            }

            if (onSuccess) onSuccess();
            resetForm();
            checkAvailability();
        }
    };

    const resetForm = () => {
        setFormData({
            renter_name: '',
            renter_email: user?.email || '',
            renter_phone: '',
            start_hour: '09:00',
            duration_hours: 1,
            purpose: ''
        });
        setCardDetails({
            number: '',
            expiry: '',
            cvc: '',
            name: ''
        });
        setSelectedRoom(null);
        setSelectedDate(new Date());
    };

    const getRoomTypeIcon = (type: Room['room_type']) => {
        if (type === 'virtual') return <Video className="h-6 w-6 text-indigo-500" />;
        if (type === 'event_hall' || type === 'event') return <Users className="h-6 w-6 text-teal-500" />;
        return <Building2 className="h-6 w-6 text-blue-500" />;
    };

    const getRoomTypeLabel = (type: Room['room_type']) => {
        const labels: Record<string, string> = {
            consultation: 'Consultorio',
            physical: 'Consultorio',
            event_hall: 'Salón de Eventos',
            event: 'Salón de Eventos',
            virtual: 'Virtual'
        };
        return labels[type] || 'Espacio';
    };

    const formatCOP = (amount: number) => {
        return `$${amount.toLocaleString('es-CO')} COP`;
    };

    if (showPayment && selectedRoom) {
        const total = (selectedRoom.price_per_hour || 50000) * formData.duration_hours;

        return (
            <Card className="border-none shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                            <CreditCard className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">Confirmación de Pago</h2>
                    </div>
                    <p className="text-teal-50 opacity-90">
                        Completa el pago para reservar <strong>{selectedRoom.name}</strong>
                    </p>
                </div>

                <CardContent className="p-6 space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Resumen</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-slate-700">
                                    <span>Espacio</span>
                                    <span className="font-medium">{selectedRoom.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-700">
                                    <span>Duración</span>
                                    <span className="font-medium">{formData.duration_hours} hora(s)</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-700">
                                    <span>Tarifa</span>
                                    <span className="font-medium">{formatCOP(selectedRoom.price_per_hour || 50000)} / hora</span>
                                </div>
                                <div className="h-px bg-slate-200 my-2" />
                                <div className="flex justify-between items-center text-lg font-bold text-teal-700">
                                    <span>Total a Pagar</span>
                                    <span>{formatCOP(total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Reserva Inmediata</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Al confirmar, tu espacio quedará reservado automáticamente. El pago se procesará de forma segura.
                            </p>
                            <Button className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg shadow-teal-500/20 py-6 text-lg" onClick={handlePaymentAndBooking} disabled={loading}>
                                {loading ? 'Procesando...' : `Pagar ${formatCOP(total)}`}
                            </Button>
                            <Button variant="ghost" className="mt-3 text-slate-500" onClick={() => setShowPayment(false)} disabled={loading}>
                                Cancelar y volver
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg shadow-teal-500/20">
                    <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Alquiler de Espacios</h2>
                    <p className="text-slate-500 mt-1">
                        {hasRole('patient') && 'Reserva salones de eventos para tus talleres y actividades.'}
                        {hasRole('doctor') && 'Gestiona tus consultorios y espacios profesionales.'}
                        {hasRole('receptionist') && 'Administra la disponibilidad de espacios del centro.'}
                    </p>
                </div>
            </div>

            {/* Step 1: Select Room */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">1</span>
                    <h3 className="text-lg font-semibold text-slate-800">Selecciona un espacio</h3>
                </div>

                {rooms.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No hay espacios disponibles para tu perfil.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                onClick={() => setSelectedRoom(room)}
                                className={`group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${selectedRoom?.id === room.id
                                    ? 'border-teal-500 bg-teal-50/50 shadow-md ring-1 ring-teal-500'
                                    : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-lg hover:-translate-y-1'
                                    }`}
                            >
                                <div className="relative z-10 flex items-start justify-between mb-4">
                                    <div className={`p-2.5 rounded-xl ${selectedRoom?.id === room.id ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-teal-50 group-hover:text-teal-600'} transition-colors`}>
                                        {getRoomTypeIcon(room.room_type)}
                                    </div>
                                    <Badge variant="secondary" className={`${selectedRoom?.id === room.id ? 'bg-teal-200 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                                        {getRoomTypeLabel(room.room_type)}
                                    </Badge>
                                </div>

                                <h4 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-teal-700 transition-colors">{room.name}</h4>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{room.description || 'Espacio perfectamente adecuado para tus necesidades.'}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex items-center text-xs text-slate-500 gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>Cap: {room.capacity}</span>
                                    </div>
                                    <span className="font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg text-sm">
                                        {formatCOP(room.price_per_hour || 50000)}/h
                                    </span>
                                </div>
                                {selectedRoom?.id === room.id && (
                                    <div className="absolute inset-0 border-2 border-teal-500 rounded-2xl pointer-events-none" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {selectedRoom && (
                <form onSubmit={handlePreSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

                    {/* Step 2: Date & Time */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">2</span>
                            <h3 className="text-lg font-semibold text-slate-800">Fecha y Disponibilidad</h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={(date) => date < new Date()}
                                        className="rounded-md mx-auto"
                                        locale={es}
                                        classNames={{
                                            head_cell: "text-slate-500 font-medium text-sm pt-1",
                                            cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-teal-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full transition-colors",
                                            day_selected: "bg-teal-600 text-white hover:bg-teal-600 hover:text-white focus:bg-teal-600 focus:text-white shadow-md shadow-teal-500/30",
                                            day_today: "bg-slate-100 text-slate-900 font-bold",
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-6">
                                {checkingAvailability ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <div className="animate-spin mb-3"><Clock className="h-6 w-6" /></div>
                                        <p>Consultando disponibilidad...</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-slate-700">Horarios Disponibles</h4>
                                            <div className="flex gap-3 text-xs">
                                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Libre</div>
                                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Ocupado</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                            {availableSlots.map((slot) => (
                                                <div
                                                    key={slot.hour}
                                                    className={`
                                                        flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition-all
                                                        ${slot.available
                                                            ? 'bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-teal-400 hover:text-teal-600'
                                                            : 'bg-rose-50 border border-rose-100 text-rose-400 opacity-60 cursor-not-allowed'}
                                                    `}
                                                >
                                                    {slot.available ? <CheckCircle className="h-3 w-3 mb-1 text-emerald-500" /> : <XCircle className="h-3 w-3 mb-1" />}
                                                    {slot.hour}:00
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-600 text-xs uppercase tracking-wider font-bold">Hora de Inicio</Label>
                                                <Select
                                                    value={formData.start_hour}
                                                    onValueChange={(value) => setFormData({ ...formData, start_hour: value })}
                                                >
                                                    <SelectTrigger className="bg-white border-slate-200 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableSlots.map((slot) => (
                                                            <SelectItem
                                                                key={slot.hour}
                                                                value={`${slot.hour.toString().padStart(2, '0')}:00`}
                                                                disabled={!slot.available}
                                                            >
                                                                {slot.hour}:00 {slot.available ? '' : '(Ocupado)'}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-slate-600 text-xs uppercase tracking-wider font-bold">Duración</Label>
                                                <Select
                                                    value={formData.duration_hours.toString()}
                                                    onValueChange={(value) => setFormData({ ...formData, duration_hours: parseInt(value) })}
                                                >
                                                    <SelectTrigger className="bg-white border-slate-200 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((hours) => (
                                                            <SelectItem key={hours} value={hours.toString()}>
                                                                {hours} {hours === 1 ? 'hora' : 'horas'}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Step 3: Contact Info */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">3</span>
                            <h3 className="text-lg font-semibold text-slate-800">Detalles de la Reserva</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-xs uppercase tracking-wider font-bold">Nombre Completo *</Label>
                                    <Input
                                        value={formData.renter_name}
                                        onChange={(e) => setFormData({ ...formData, renter_name: e.target.value })}
                                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors h-11"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-xs uppercase tracking-wider font-bold">Email de Contacto *</Label>
                                    <Input
                                        type="email"
                                        value={formData.renter_email}
                                        onChange={(e) => setFormData({ ...formData, renter_email: e.target.value })}
                                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors h-11"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-xs uppercase tracking-wider font-bold">Teléfono (+57)</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">
                                            +57
                                        </div>
                                        <Input
                                            type="tel"
                                            value={formData.renter_phone}
                                            onChange={handlePhoneChange}
                                            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors h-11 pl-12"
                                            placeholder="3000000000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-xs uppercase tracking-wider font-bold">Propósito</Label>
                                    <Input
                                        value={formData.purpose}
                                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                        placeholder="Ej: Taller de Yoga, Celebración..."
                                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors h-11"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            size="lg"
                            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg shadow-teal-500/25 rounded-full px-8 h-12 text-base font-semibold transition-transform hover:scale-105"
                            disabled={loading}
                        >
                            Continuar al Pago ({formatCOP((selectedRoom.price_per_hour || 50000) * formData.duration_hours)})
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
};
