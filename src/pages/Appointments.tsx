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
  const loadPatientAppointments = async (patientId: string) => {
    const { data } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status, is_virtual, notes')
      .eq('patient_id', patientId)
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    setMyAppointments((data as AppointmentData[]) || []);
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

        // 2. Obtener SOLO doctores AFILIADOS (pacientes solo ven médicos del centro)
        const { data: doctorProfiles } = await supabase
          .from('doctor_profiles')
          .select(`
              id,
              user_id,
              specialty,
              bio,
              is_affiliated,
              profiles(full_name)
            `)
          .eq('is_affiliated', true); // Solo médicos afiliados al centro

        if (doctorProfiles) {
          const list: DoctorInfo[] = doctorProfiles.map((d: any) => ({
            doctorProfileId: d.id,
            doctorName: d.profiles?.full_name || 'Especialista',
            specialty: d.specialty,
            bio: d.bio
          }));
          setDoctors(list);
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

  const handleCancel = async (appointmentId: string) => {
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

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          {hasRole('doctor') ? 'Mi Agenda Médica' : 'Mis Citas'}
        </h1>

        {/* Citas programadas */}
        {myAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Próximas citas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(apt.start_time), 'EEEE d MMMM', { locale: es })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(apt.start_time), 'HH:mm')} -
                        {format(new Date(apt.end_time), 'HH:mm')} |
                        {apt.is_virtual ? ' Virtual' : ' Presencial'}
                        {apt.patientName && <span className="block font-semibold text-primary mt-1">Paciente: {apt.patientName}</span>}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancel(apt.id)}
                      disabled={cancelLoading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reservar nueva cita (SOLO PACIENTES) */}
        {!hasRole('doctor') && !selectedDoctor ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Elige tu especialista</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <Card
                  key={doc.doctorProfileId}
                  className="hover:border-primary cursor-pointer transition-colors"
                  onClick={() => setSelectedDoctor(doc)}
                >
                  <CardHeader className="pb-2">
                    <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                      <UserCircle className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{doc.doctorName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-primary mb-2">{doc.specialty}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.bio || 'Sin descripción disponible.'}
                    </p>
                    <Button variant="outline" className="w-full mt-4 group-hover:bg-primary group-hover:text-white">
                      Ver Disponibilidad
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {doctors.length === 0 && (
                <p className="col-span-full text-center py-8 text-muted-foreground">
                  No hay doctores disponibles en este momento.
                </p>
              )}
            </div>
          </div>
        ) : !hasRole('doctor') ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Agendar Cita</h2>
              <Button variant="ghost" onClick={() => setSelectedDoctor(null)}>
                ← Cambiar Doctor
              </Button>
            </div>
            {patientProfileId && (
              <AppointmentBooking
                doctorId={selectedDoctor.doctorProfileId}
                patientId={patientProfileId}
                doctorName={selectedDoctor.doctorName}
                onSuccess={handleBookingSuccess}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Appointments;
