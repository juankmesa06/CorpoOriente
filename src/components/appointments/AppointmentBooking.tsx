import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppointments } from '@/hooks/useAppointments';
import { Clock, Video, MapPin, Loader2, DoorOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppointmentBookingProps {
  doctorId: string;
  patientId: string;
  doctorName?: string;
  onSuccess?: () => void;
}

export const AppointmentBooking = ({
  doctorId,
  patientId,
  doctorName = 'Doctor',
  onSuccess
}: AppointmentBookingProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isVirtual, setIsVirtual] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  const { loading, slots, rooms, getAvailability, getRooms, createAppointment } = useAppointments();

  useEffect(() => {
    getRooms();
  }, []);

  useEffect(() => {
    if (selectedDate && doctorId) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      getAvailability(doctorId, dateStr);
      setSelectedSlot(null);
    }
  }, [selectedDate, doctorId]);

  // Limpiar selección de consultorio cuando cambia a virtual
  useEffect(() => {
    if (isVirtual) {
      setSelectedRoom('');
    }
  }, [isVirtual]);

  const handleBooking = async () => {
    if (!selectedSlot) return;
    // Eliminated room check as patient doesn't select it

    const result = await createAppointment(
      doctorId,
      patientId,
      selectedSlot,
      isVirtual,
      undefined, // roomId is now undefined for patient booking
      notes || undefined
    );

    if (result) {
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setSelectedRoom('');
      setNotes('');
      // Redirect to payment page instead of just closing
      // onSuccess could be used to close modal if present, but navigation takes priority
      onSuccess?.();
      navigate(`/payment/${result.id}`);
    }
  };

  const formatSlotTime = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, 'HH:mm', { locale: es });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Reservar cita con {doctorName}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Horario: 7:00 AM - 9:00 PM | Duración: 1 hora
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selector de fecha */}
        <div>
          <Label className="text-base font-medium">Selecciona una fecha</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date() || date.getDay() === 0}
            className="rounded-md border mt-2"
            locale={es}
          />
        </div>

        {/* Slots disponibles */}
        {selectedDate && (
          <div>
            <Label className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horarios disponibles - {format(selectedDate, 'EEEE d MMMM', { locale: es })}
            </Label>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {slots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedSlot === slot ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full"
                  >
                    {formatSlotTime(slot)}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm mt-3">
                No hay horarios disponibles para esta fecha
              </p>
            )}
          </div>
        )}

        {/* Tipo de cita */}
        {selectedSlot && (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {isVirtual ? (
                  <Video className="h-5 w-5 text-primary" />
                ) : (
                  <MapPin className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="font-medium">
                    {isVirtual ? 'Cita Virtual' : 'Cita Presencial'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isVirtual ? 'Se enviará link de videollamada' : 'Requiere consultorio'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isVirtual}
                onCheckedChange={setIsVirtual}
              />
            </div>

            {/* Selector de consultorio (REMOVIDO: El paciente no selecciona consultorio) */}

            {/* Notas */}
            <div>
              <Label htmlFor="notes">Notas adicionales (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Síntomas, motivo de consulta..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Resumen y confirmar */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-medium">Resumen de la cita:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>📅 {format(new Date(selectedSlot), 'EEEE d MMMM yyyy', { locale: es })}</li>
                <li>🕐 {formatSlotTime(selectedSlot)} - {format(new Date(new Date(selectedSlot).getTime() + 60 * 60 * 1000), 'HH:mm')}</li>
                <li>{isVirtual ? '💻 Virtual' : '🏥 Presencial'}</li>
              </ul>
            </div>

            <Button
              onClick={handleBooking}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reservando...
                </>
              ) : (
                'Confirmar Reserva'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
