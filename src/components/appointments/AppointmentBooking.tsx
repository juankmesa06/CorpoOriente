import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppointments } from '@/hooks/useAppointments';
import { Clock, Video, MapPin, Loader2, CheckCircle2, ChevronRight, CalendarDays, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VirtualFallbackModal } from './VirtualFallbackModal';
import { cn } from '@/lib/utils';

interface AppointmentBookingProps {
  doctorId: string;
  patientId: string;
  doctorName?: string;
  doctorPhoto?: string | null;
  consultationFee?: number | null;
  specialty?: string;
  university?: string | null;
  bio?: string | null;
  onSuccess?: () => void;
}

export const AppointmentBooking = ({
  doctorId,
  patientId,
  doctorName = 'Doctor',
  doctorPhoto,
  consultationFee,
  specialty,
  university,
  bio,
  onSuccess
}: AppointmentBookingProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isVirtual, setIsVirtual] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [showVirtualFallback, setShowVirtualFallback] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  const { loading, slots, getAvailability, getRooms, createAppointment, checkRoomAvailability } = useAppointments();

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

  const handleBooking = async () => {
    if (!selectedSlot || isVirtual === null || isNavigating) return;

    if (isVirtual) {
      await processBooking(true);
      return;
    }

    const startTime = selectedSlot;
    const endTime = new Date(new Date(selectedSlot).getTime() + 60 * 60 * 1000).toISOString();

    if (checkRoomAvailability) {
      const roomAvailable = await checkRoomAvailability(startTime, endTime);
      if (!roomAvailable) {
        setShowVirtualFallback(true);
        return;
      }
    }

    await processBooking(false);
  };

  const processBooking = async (forceVirtual: boolean) => {
    if (!selectedSlot) return;

    const result = await createAppointment(
      doctorId,
      patientId,
      selectedSlot,
      forceVirtual,
      undefined,
      notes || undefined
    );

    if (result) {
      setIsNavigating(true);
      // Delay navigation and ensure no state updates happen after this
      setTimeout(() => {
        navigate(`/payment/${result.id}`);
      }, 0);
    }
  };

  const formatSlotTime = (isoString: string) => {
    const date = new Date(isoString);
    // Explicitly use 'en-US' locale-like formatting for AM/PM to avoid any global locale issues
    return format(date, 'h:mm a');
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border-none shadow-2xl bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-800 text-white p-8">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm overflow-hidden border-2 border-white/30 shrink-0">
            {doctorPhoto ? (
              <img src={doctorPhoto} alt={doctorName} className="h-full w-full object-cover" />
            ) : (
              <CalendarDays className="h-10 w-10 text-white" />
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold">{doctorName}</CardTitle>

            <div className="space-y-1 mt-1">
              {specialty && (
                <p className="text-teal-100 font-bold text-sm tracking-wide uppercase">
                  {specialty}
                </p>
              )}
              {university && (
                <p className="text-teal-50 text-xs flex items-center gap-1.5 opacity-90">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Egresado de {university}
                </p>
              )}
            </div>

            {bio && (
              <p className="text-white/80 text-xs mt-2 leading-relaxed max-w-lg line-clamp-2">
                {bio}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3 text-xs font-medium">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 text-white">
                9:00 AM - 7:00 PM
              </span>
              {consultationFee && (
                <span className="bg-emerald-500/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-400/50 text-white font-bold shadow-sm">
                  ${consultationFee.toLocaleString()} COP
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {/* Step 1: Modality Selection */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">1</span>
              <span>Tipo de consulta</span>
            </h3>
            {isVirtual !== null && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setIsVirtual(false)}
              className={cn(
                "relative flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-300 text-left group",
                isVirtual === false
                  ? "border-teal-500 bg-teal-50/50 shadow-md"
                  : "border-slate-100 hover:border-teal-200 hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl mb-3 transition-colors",
                isVirtual === false ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-600"
              )}>
                <MapPin className="h-6 w-6" />
              </div>
              <p className="font-bold text-slate-800"><span>Presencial</span></p>
              <p className="text-xs text-slate-500 mt-1"><span>En consultorio médico físico</span></p>
              {isVirtual === false && <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-teal-500 animate-pulse" />}
            </button>

            <button
              onClick={() => setIsVirtual(true)}
              className={cn(
                "relative flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-300 text-left group",
                isVirtual === true
                  ? "border-purple-500 bg-purple-50/50 shadow-md"
                  : "border-slate-100 hover:border-purple-200 hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl mb-3 transition-colors",
                isVirtual === true ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600"
              )}>
                <Video className="h-6 w-6" />
              </div>
              <p className="font-bold text-slate-800"><span>Virtual (Telemedicina)</span></p>
              <p className="text-xs text-slate-500 mt-1"><span>Videollamada segura de alta definición</span></p>
              {isVirtual === true && <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-purple-500 animate-pulse" />}
            </button>
          </div>
        </section>

        {isVirtual !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Step 2: Calendar Selection */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">2</span>
                <span>Fecha</span>
              </h3>
              <div className="border border-slate-100 rounded-2xl p-2 sm:p-4 md:p-6 bg-white shadow-sm w-full overflow-hidden">
                <div className="w-full overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    className="rounded-xl border-none w-full min-w-[280px] mx-auto"
                    classNames={{
                      month: "w-full space-y-3 sm:space-y-4",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex w-full justify-between",
                      row: "flex w-full mt-1 sm:mt-2 justify-between gap-1 sm:gap-0"
                    }}
                    locale={es}
                  />
                </div>
              </div>
            </section>

            {/* Step 3: Slots Selection */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">3</span>
                <span>Horario</span>
              </h3>

              {selectedDate ? (
                loading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
                    <p className="text-sm font-medium text-slate-400"><span>Consultando agenda...</span></p>
                  </div>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          "py-3 sm:py-3 rounded-xl border-2 font-bold text-sm sm:text-base transition-all duration-200 active:scale-95 touch-manipulation min-h-[48px]",
                          selectedSlot === slot
                            ? "bg-gradient-to-r from-teal-600 to-teal-700 border-teal-600 text-white shadow-md shadow-teal-600/20 scale-105"
                            : "bg-white border-slate-100 text-slate-600 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50"
                        )}
                      >
                        <span>{formatSlotTime(slot)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                    <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-amber-800"><span>No hay cupos disponibles</span></p>
                    <p className="text-xs text-amber-600 mt-1"><span>Intenta con otra fecha cercana</span></p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                  <CalendarDays className="h-10 w-10 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400"><span>Selecciona una fecha primero</span></p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Final Step: Notes & Confirmation */}
        {selectedSlot && (
          <div className="pt-6 border-t border-slate-100 animate-in fade-in zoom-in-95 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-sm font-bold text-slate-700"><span>Notas de la consulta (Opcional)</span></Label>
                <Textarea
                  id="notes"
                  placeholder="Ej: Seguimiento de tratamiento, primera sesión..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl border-slate-200 focus:ring-teal-500"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-[-20px] right-[-20px] h-20 w-20 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2"><span>Resumen de reserva</span></p>
                  <div className="space-y-1">
                    <p className="text-lg font-black"><span>{format(new Date(selectedSlot), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</span></p>
                    <div className="flex items-center gap-2 text-teal-400 font-bold">
                      <Clock className="h-4 w-4" />
                      <span>{formatSlotTime(selectedSlot)}</span>
                      <span className="text-slate-500 text-xs ml-auto font-medium"><span>1 hora de sesión</span></span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleBooking}
                  disabled={loading || isNavigating}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirmar y Pagar</span>
                        <ChevronRight className="h-5 w-5" />
                      </>
                    )}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <VirtualFallbackModal
        open={showVirtualFallback}
        onOpenChange={setShowVirtualFallback}
        doctorName={doctorName}
        onConfirm={() => {
          setShowVirtualFallback(false);
          setIsVirtual(true);
          processBooking(true);
        }}
        onCancel={() => setShowVirtualFallback(false)}
      />
    </Card>
  );
};
