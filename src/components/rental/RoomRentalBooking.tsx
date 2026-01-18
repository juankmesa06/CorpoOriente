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

interface Room {
    id: string;
    name: string;
    description: string | null;
    room_type: 'consultation' | 'event_hall' | 'virtual';
    capacity: number;
    is_active: boolean;
    hourly_rate: number;
}

interface TimeSlot {
    hour: number;
    available: boolean;
}

export const RoomRentalBooking = () => {
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
            // Filtrar según rol del usuario
            let filteredRooms = data || [];

            if (hasRole('patient')) {
                // Pacientes solo ven salones de eventos
                filteredRooms = filteredRooms.filter(room => room.room_type === 'event_hall');
            } else if (hasRole('doctor')) {
                // Médicos ven TODO
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

        const { data: rentals } = await supabase
            .from('room_rentals')
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
        const allBookings = [...(rentals || []), ...(appointments || [])];

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
        if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name) {
            toast.error('Por favor completa los datos del pago');
            return;
        }

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
        const { error } = await supabase
            .from('room_rentals')
            .insert([{
                room_id: selectedRoom!.id,
                user_id: user?.id || null,
                renter_name: formData.renter_name,
                renter_email: formData.renter_email,
                renter_phone: formData.renter_phone,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                purpose: formData.purpose,
                hourly_rate: selectedRoom!.hourly_rate || 50000,
                total_price: (selectedRoom!.hourly_rate || 50000) * formData.duration_hours,
                status: 'confirmed' // Confirmado porque ya pagó
            }]);

        setLoading(false);
        setShowPayment(false);

        if (error) {
            console.error('Error creating rental:', error);
            toast.error('Error al procesar la reserva. El pago será reversado.');
        } else {
            toast.success('¡Pago exitoso y reserva confirmada!');
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
        if (type === 'virtual') return <Video className="h-5 w-5" />;
        if (type === 'event_hall') return <Users className="h-5 w-5" />;
        return <Building2 className="h-5 w-5" />;
    };

    const getRoomTypeLabel = (type: Room['room_type']) => {
        const labels = {
            consultation: 'Consultorio',
            event_hall: 'Salón de Eventos',
            virtual: 'Virtual'
        };
        return labels[type];
    };

    const formatCOP = (amount: number) => {
        return `$${amount.toLocaleString('es-CO')} COP`;
    };

    if (showPayment && selectedRoom) {
        const total = (selectedRoom.hourly_rate || 50000) * formData.duration_hours;

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-primary" />
                        Confirmación de Pago
                    </CardTitle>
                    <CardDescription>
                        Completa el pago para confirmar tu reserva de {selectedRoom.name}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-primary/5 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-medium text-lg">Total a Pagar</p>
                            <p className="text-sm text-muted-foreground">{formData.duration_hours} horas x {formatCOP(selectedRoom.hourly_rate)}</p>
                        </div>
                        <p className="text-3xl font-bold text-primary">{formatCOP(total)}</p>
                    </div>

                    <div className="space-y-4 border p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">Detalles de la Tarjeta</h3>
                        </div>

                        <div className="space-y-2">
                            <Label>Nombre en la tarjeta</Label>
                            <Input
                                placeholder="Como aparece en la tarjeta"
                                value={cardDetails.name}
                                onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Número de tarjeta</Label>
                            <Input
                                placeholder="0000 0000 0000 0000"
                                maxLength={19}
                                value={cardDetails.number}
                                onChange={e => setCardDetails({ ...cardDetails, number: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Expiración (MM/YY)</Label>
                                <Input
                                    placeholder="MM/YY"
                                    maxLength={5}
                                    value={cardDetails.expiry}
                                    onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CVC</Label>
                                <Input
                                    placeholder="123"
                                    maxLength={3}
                                    type="password"
                                    value={cardDetails.cvc}
                                    onChange={e => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="w-full" onClick={() => setShowPayment(false)} disabled={loading}>
                            Atrás
                        </Button>
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handlePaymentAndBooking} disabled={loading}>
                            {loading ? 'Procesando...' : `Pagar ${formatCOP(total)}`}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-6 w-6" />
                        Alquiler de Espacios
                    </CardTitle>
                    <CardDescription>
                        {hasRole('patient') && 'Reserva salones de eventos para talleres y actividades grupales'}
                        {hasRole('doctor') && 'Reserva consultorios, salones o espacios virtuales para tus necesidades profesionales'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-semibold mb-3 block">1. Selecciona un espacio</Label>
                            {rooms.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No hay espacios disponibles para tu rol
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {rooms.map((room) => (
                                        <div
                                            key={room.id}
                                            onClick={() => setSelectedRoom(room)}
                                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${selectedRoom?.id === room.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="bg-primary/10 p-2 rounded-lg">
                                                    {getRoomTypeIcon(room.room_type)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium">{room.name}</p>
                                                    <Badge variant="outline" className="text-xs mt-1">
                                                        {getRoomTypeLabel(room.room_type)}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {room.description || 'Espacio disponible'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Capacidad: {room.capacity} personas
                                                    </p>
                                                    <p className="text-sm font-semibold text-primary mt-2">
                                                        {formatCOP(room.hourly_rate || 50000)}/hora
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedRoom && (
                            <form onSubmit={handlePreSubmit} className="space-y-6 pt-6 border-t">
                                <div>
                                    <Label className="text-base font-semibold mb-3 block">2. Selecciona fecha y hora</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Fecha</Label>
                                            <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                disabled={(date) => date < new Date()}
                                                className="rounded-md border"
                                                locale={es}
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            {/* Availability Display */}
                                            {checkingAvailability ? (
                                                <div className="p-4 bg-muted rounded-lg">
                                                    <p className="text-sm text-center">Verificando disponibilidad...</p>
                                                </div>
                                            ) : availableSlots.length > 0 && (
                                                <div className="p-4 bg-muted rounded-lg">
                                                    <Label className="text-sm font-semibold mb-2 block">Disponibilidad del día</Label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {availableSlots.map((slot) => (
                                                            <div
                                                                key={slot.hour}
                                                                className={`p-2 rounded text-center text-xs ${slot.available
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                                                                    }`}
                                                            >
                                                                {slot.available ? (
                                                                    <CheckCircle className="h-3 w-3 mx-auto mb-1" />
                                                                ) : (
                                                                    <XCircle className="h-3 w-3 mx-auto mb-1" />
                                                                )}
                                                                {slot.hour}:00
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2 text-center">
                                                        Verde = Disponible | Rojo = Ocupado
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <Label htmlFor="start_hour">Hora de inicio</Label>
                                                <Select
                                                    value={formData.start_hour}
                                                    onValueChange={(value) => setFormData({ ...formData, start_hour: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableSlots.map((slot) => (
                                                            <SelectItem
                                                                key={slot.hour}
                                                                value={`${slot.hour.toString().padStart(2, '0')}:00`}
                                                                disabled={!slot.available}
                                                            >
                                                                {slot.hour}:00 {slot.available ? '✓' : '✗ Ocupado'}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="duration">Duración (horas)</Label>
                                                <Select
                                                    value={formData.duration_hours.toString()}
                                                    onValueChange={(value) => setFormData({ ...formData, duration_hours: parseInt(value) })}
                                                >
                                                    <SelectTrigger>
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
                                            <div className="bg-primary/5 p-3 rounded-lg">
                                                <p className="text-sm font-medium">Precio estimado</p>
                                                <p className="text-2xl font-bold text-primary">
                                                    {formatCOP((selectedRoom.hourly_rate || 50000) * formData.duration_hours)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCOP(selectedRoom.hourly_rate || 50000)}/hora
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-base font-semibold mb-3 block">3. Información de contacto</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="renter_name">Nombre completo *</Label>
                                            <Input
                                                id="renter_name"
                                                value={formData.renter_name}
                                                onChange={(e) => setFormData({ ...formData, renter_name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="renter_email">Email *</Label>
                                            <Input
                                                id="renter_email"
                                                type="email"
                                                value={formData.renter_email}
                                                onChange={(e) => setFormData({ ...formData, renter_email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="renter_phone">Teléfono</Label>
                                            <Input
                                                id="renter_phone"
                                                type="tel"
                                                value={formData.renter_phone}
                                                onChange={(e) => setFormData({ ...formData, renter_phone: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="purpose">Propósito de la reserva</Label>
                                            <Textarea
                                                id="purpose"
                                                value={formData.purpose}
                                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                                placeholder="Ej: Consulta privada, taller grupal..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                                    Continuar al Pago
                                </Button>
                            </form>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
