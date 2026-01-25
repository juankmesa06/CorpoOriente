import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppointmentBooking } from '@/components/appointments/AppointmentBooking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, X, Loader2, UserCircle } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { toast } from 'sonner';

interface DoctorInfo {
  doctorProfileId: string;
  doctorName: string;
  specialty: string;
  bio?: string | null;
}

interface AppointmentData {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  is_virtual: boolean;
  notes: string | null;
  patientName?: string;
}

const Appointments = () => {
  const { user, hasRole } = useAuth();
  const { cancelAppointment, loading: cancelLoading } = useAppointments();

  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorInfo | null>(null);
  const [myAppointments, setMyAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load appointments for DOCTOR (shows all patients)
  const loadDoctorAppointments = async (doctorProfileId: string) => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        id, start_time, end_time, status, is_virtual, notes,
        patient_profiles(profiles(full_name))
      `)
      .eq('doctor_id', doctorProfileId)
      .order('start_time', { ascending: true });

    setMyAppointments((data as any[])?.map(apt => ({
      ...apt,
      patientName: apt.patient_profiles?.profiles?.full_name
    })) || []);
  };

  // Load appointments for PATIENT (shows their own)
  // Load appointments for PATIENT (shows their own)
  const loadPatientAppointments = async (patientId: string) => {
    console.log('Loading appointments for patient:', patientId);
    // Simplified query consistent with Dashboard fix
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .in('status', ['confirmed', 'scheduled', 'completed']) // REMOVED 'cancelled' as requested
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching appointments page:', error);
      toast.error('Error cargando citas: ' + error.message);
      return;
    }

    console.log('Appointments page data:', data);

    setMyAppointments((data as any[])?.map(apt => ({
      ...apt,
      // Temporarily removed doctor name lookup to ensure data shows up first
      doctorName: 'Doctor'
    })) || []);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;

      try {
        // If DOCTOR
        if (hasRole('doctor')) {
          const { data: docProfile } = await supabase
            .from('doctor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (docProfile) {
            await loadDoctorAppointments(docProfile.id);
          }
          setLoading(false);
          return;
        }

        // If PATIENT (or others)
        // 1. Obtener perfil de paciente
        const { data: patientProfile } = await supabase
          .from('patient_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!patientProfile) {
          setLoading(false);
          return;
        }

        setPatientProfileId(patientProfile.id);

        // 2. Obtener Doctores (separado para evitar errores de join)
        const { data: doctorProfiles, error: docError } = await supabase
          .from('doctor_profiles')
          .select('id, user_id, specialty, bio')
          .order('id');

        if (docError) {
          console.error('Error fetching doctors:', docError);
        }

        if (doctorProfiles && doctorProfiles.length > 0) {
          // 2.1 Obtener nombres desde profiles manualmente
          const userIds = doctorProfiles.map(d => d.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);

          const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]));

          const list: DoctorInfo[] = doctorProfiles.map((d: any) => ({
            doctorProfileId: d.id,
            doctorName: profilesMap.get(d.user_id) || 'Doctor',
            specialty: d.specialty,
            bio: d.bio
          }));
          setDoctors(list);
        } else {
          setDoctors([]);
        }

        // 3. Cargar citas del paciente
        await loadPatientAppointments(patientProfile.id);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [user]);

  const handleCancel = async (appointmentId: string, startTime: string) => { // Added startTime param
    const now = new Date();
    const start = new Date(startTime);
    const hoursDifference = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      toast.warning('Política de Cancelación', {
        description: 'Solo se pueden cancelar citas con al menos 24 horas de anticipación.',
        duration: 5000,
      });
      return;
    }

    const success = await cancelAppointment(appointmentId, hasRole('doctor') ? 'Cancelado por el médico' : 'Cancelado por el paciente');
    if (success) {
      // Reload based on role
      if (hasRole('doctor')) {
        const { data: docProfile } = await supabase
          .from('doctor_profiles')
          .select('id')
          .eq('user_id', user!.id)
          .single();
        if (docProfile) loadDoctorAppointments(docProfile.id);
      } else if (patientProfileId) {
        loadPatientAppointments(patientProfileId);
      }
    }
  };

  const handleBookingSuccess = () => {
    if (patientProfileId) {
      loadPatientAppointments(patientProfileId);
      // Reset view to show list
      setSelectedDoctor(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no es paciente ni doctor ni admin/recep, mostrar mensaje
  if (!hasRole('patient') && !hasRole('doctor') && !hasRole('admin') && !hasRole('receptionist')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>No tienes permisos para ver esta sección.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unificar todas las citas en una sola lista, ordenadas por fecha descendente
  const allAppointments = myAppointments.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  // Eliminamos lógica de filtrado por fecha para mostrar TODO
  // const upcomingAppointments = ...
  // const pastAppointments = ...

  return (
    <div className="min-h-screen bg-gray-50/30 pb-12 animate-in fade-in duration-500">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/5">
        <div className="container mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
            <CalendarDays className="h-10 w-10 text-primary" />
            {hasRole('doctor') ? 'Mi Agenda Médica' : 'Gestión de Citas'}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            {hasRole('doctor')
              ? 'Gestiona tus consultas y horarios desde un solo lugar.'
              : 'Agenda tu próxima consulta con nuestros especialistas de forma rápida y sencilla.'}
          </p>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-8 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: MAIN CONTENT (Booking) */}
          <div className="lg:col-span-2 space-y-8">

            {/* How to Book Banner (Only distinct if not booking yet) */}
            {!hasRole('doctor') && !selectedDoctor && (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-primary/10" />

                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
                  <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  ¿Cómo agendar tu cita?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                  <div className="relative">
                    <div className="text-6xl font-black text-slate-100 absolute -top-4 -left-4 -z-10 select-none">1</div>
                    <h3 className="font-bold text-slate-800 mb-1">Elige Especialista</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Explora nuestro directorio y selecciona al médico ideal para tu necesidad.</p>
                  </div>
                  <div className="relative">
                    <div className="text-6xl font-black text-slate-100 absolute -top-4 -left-4 -z-10 select-none">2</div>
                    <h3 className="font-bold text-slate-800 mb-1">Selecciona Horario</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Elige la fecha y hora que mejor se ajuste a tu disponibilidad en el calendario.</p>
                  </div>
                  <div className="relative">
                    <div className="text-6xl font-black text-slate-100 absolute -top-4 -left-4 -z-10 select-none">3</div>
                    <h3 className="font-bold text-slate-800 mb-1">Confirmación</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Recibe la confirmación inmediata en tu correo y panel de usuario.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Content Area */}
            {!hasRole('doctor') && !selectedDoctor ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <UserCircle className="h-6 w-6 text-primary" />
                    Nuestros Especialistas
                  </h2>
                  <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {doctors.length} Disponibles
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {doctors.map((doc) => (
                    <Card
                      key={doc.doctorProfileId}
                      className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-200 overflow-hidden cursor-pointer bg-white relative"
                      onClick={() => setSelectedDoctor(doc)}
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/60 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                      <CardHeader className="pb-4 pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-1.5 rounded-full shadow-sm">
                              <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                                <UserCircle className="h-8 w-8 text-primary/80" />
                              </div>
                            </div>
                            <div>
                              <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-primary transition-colors">
                                {doc.doctorName}
                              </CardTitle>
                              <span className="inline-block px-2.5 py-0.5 bg-primary/5 text-primary text-xs font-bold uppercase tracking-wider rounded-md mt-1.5">
                                {doc.specialty}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-6 leading-relaxed">
                          {doc.bio || 'Especialista comprometido con el bienestar integral de sus pacientes.'}
                        </p>
                        <Button className="w-full bg-slate-900 text-white hover:bg-primary transition-colors font-medium shadow-lg hover:shadow-primary/25">
                          Ver Disponibilidad
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {doctors.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                      <UserCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No hay doctores disponibles en este momento.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : !hasRole('doctor') ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Agendar Cita</h2>
                    <p className="text-slate-500">Completando reserva con <span className="text-primary font-semibold">{selectedDoctor?.doctorName}</span></p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedDoctor(null)} className="gap-2 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                    ← Volver al directorio
                  </Button>
                </div>
                {patientProfileId && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 md:p-6">
                    <AppointmentBooking
                      doctorId={selectedDoctor.doctorProfileId}
                      patientId={patientProfileId}
                      doctorName={selectedDoctor.doctorName}
                      onSuccess={handleBookingSuccess}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right Column: SIDEBAR (History) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Tu Historial
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {allAppointments.length} CITAS
                </span>
              </div>

              {allAppointments.length > 0 ? (
                <div className="space-y-4 pr-1 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                  {allAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="group flex flex-col p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-primary/20 transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Status Indicator Bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300
                                ${apt.status === 'confirmed' ? 'bg-emerald-500' :
                          apt.status === 'paid' ? 'bg-blue-500' :
                            apt.status === 'pending' ? 'bg-amber-400' :
                              'bg-slate-300'
                        }`}
                      />

                      <div className="flex justify-between items-start mb-3 pl-3">
                        <div>
                          <p className="font-bold text-slate-700 text-xs w-full uppercase tracking-wider mb-0.5">
                            {format(new Date(apt.start_time), 'EEEE d MMM', { locale: es })}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <p className="text-2xl font-black text-slate-800 tracking-tight">
                              {format(new Date(apt.start_time), 'HH:mm')}
                            </p>
                            <p className="text-xs font-medium text-slate-400">
                              - {format(new Date(apt.end_time), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm border
                                    ${apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            apt.status === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              apt.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                          {apt.status === 'confirmed' ? 'Confirmada' :
                            apt.status === 'paid' ? 'Pagada' :
                              apt.status === 'pending' ? 'Pendiente' :
                                apt.status}
                        </div>
                      </div>

                      <div className="pl-3 mt-1 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <UserCircle className="h-4 w-4 text-slate-400" />
                          {!hasRole('doctor') && (apt as any).doctorName ? (
                            <span className="text-sm text-slate-600 font-medium truncate">Dr/a. {(apt as any).doctorName}</span>
                          ) : <span className="text-sm text-slate-400 italic">No asignado</span>}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          {apt.is_virtual ? <div className="h-2 w-2 bg-purple-500 rounded-full" /> : <div className="h-2 w-2 bg-slate-400 rounded-full" />}
                          <span className="text-xs font-medium text-slate-500">
                            {apt.is_virtual ? 'Consulta Virtual' : 'Consulta Presencial'}
                          </span>
                        </div>

                        {/* Video Call Button */}
                        {apt.is_virtual && ['confirmed', 'paid'].includes(apt.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mb-3 gap-2 bg-white hover:bg-blue-50 border-blue-100 text-blue-600 hover:text-blue-700 h-9 font-medium shadow-sm"
                            onClick={() => window.open(`https://meet.jit.si/CorpoOriente-${apt.id}`, '_blank')}
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Unirse a Llamada
                          </Button>
                        )}

                        {['scheduled', 'confirmed', 'pending', 'paid'].includes(apt.status) && new Date(apt.start_time) > new Date() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
                            onClick={() => handleCancel(apt.id, apt.start_time)}
                            disabled={cancelLoading}
                          >
                            Cancelar Cita
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">Tu agenda está libre</p>
                  <p className="text-xs text-slate-400 mt-1">Las nuevas citas aparecerán aquí</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
