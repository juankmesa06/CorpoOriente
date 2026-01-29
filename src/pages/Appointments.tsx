import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppointmentBooking } from '@/components/appointments/AppointmentBooking';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Loader2, UserCircle, Video, MapPin, ChevronRight, Clock, FileText, ClipboardList, Pill, CheckCircle2, Stethoscope, Sparkles, Shield, MessageCircle, GraduationCap } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

interface DoctorInfo {
  doctorProfileId: string;
  doctorName: string;
  specialty: string;
  bio?: string | null;
  consultationFee?: number | null;
  doctorPhoto?: string | null;
  university?: string | null;
}

interface AppointmentData {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  is_virtual: boolean;
  notes: string | null;
  patientName?: string;
  doctorName?: string;
  roomName?: string;
  clinical_entry?: any;
}

const Appointments = () => {
  const { user, hasRole, roles, loading: authLoading } = useAuth();
  const { cancelAppointment, loading: cancelLoading } = useAppointments();

  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorInfo | null>(null);
  const [myAppointments, setMyAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportId, setShowReportId] = useState<string | null>(null);

  const loadDoctorAppointments = async (doctorProfileId: string) => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        id, start_time, end_time, status, is_virtual, notes, meeting_url,
        patient_profiles(profiles(full_name, avatar_url)),
        assignedRoom:room_id(name)
      `)
      .eq('doctor_id', doctorProfileId)
      .in('status', ['confirmed', 'completed'])
      .order('start_time', { ascending: true });

    setMyAppointments((data as any[])?.map(apt => ({
      ...apt,
      patientName: apt.patient_profiles?.profiles?.full_name,
      patientPhoto: apt.patient_profiles?.profiles?.avatar_url,
      roomName: (() => {
        const rd = [(apt as any).assignedRoom, (apt as any).rooms, (apt as any).room].find(s => s && typeof s === 'object');
        return Array.isArray(rd) ? rd[0]?.name : (rd?.name || null);
      })()
    })) || []);
  };

  const loadPatientAppointments = async (patientId: string) => {
    // FILTER: Only 'confirmed' and 'completed'.
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        assignedRoom:room_id(name, description)
      `)
      .eq('patient_id', patientId)
      .in('status', ['confirmed', 'completed'])
      .order('start_time', { ascending: false });

    if (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Error al cargar citas", { description: "Por favor intente recargar la página." });
      return;
    }

    if (appointments && appointments.length > 0) {
      const appointmentIds = appointments.map(a => a.id);
      const { data: clinicalEntries } = await supabase
        .from('medical_record_entries')
        .select('*')
        .in('appointment_id', appointmentIds)
        .eq('is_current', true);

      const entriesMap = new Map(clinicalEntries?.map(e => [e.appointment_id, e]));

      const doctorIds = [...new Set(appointments.map((apt: any) => apt.doctor_id).filter(Boolean))];
      const { data: doctorProfiles } = await supabase
        .from('doctor_profiles')
        .select('id, user_id, specialty')
        .in('id', doctorIds);
      const doctorUserIds = doctorProfiles?.map(d => d.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', doctorUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));
      const doctorProfilesMap = new Map(doctorProfiles?.map(d => [d.id, d]));

      setMyAppointments(appointments.map((apt: any) => {
        const dProfile = doctorProfilesMap.get(apt.doctor_id);
        const doctorUserData = dProfile ? profilesMap.get(dProfile.user_id) : null;
        return {
          ...apt,
          doctorName: doctorUserData ? (doctorUserData as any).full_name : 'Doctor',
          doctorPhoto: (doctorUserData as any)?.avatar_url,
          roomName: (() => {
            const rd = [(apt as any).assignedRoom, (apt as any).rooms].find(s => s && typeof s === 'object');
            return Array.isArray(rd) ? rd[0]?.name : (rd?.name || null);
          })(),
          clinical_entry: entriesMap.get(apt.id)
        };
      }));
    } else {
      setMyAppointments([]);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        if (hasRole('doctor')) {
          const { data: docProfile } = await supabase.from('doctor_profiles').select('id').eq('user_id', user.id).maybeSingle();
          if (docProfile) await loadDoctorAppointments(docProfile.id);
          setLoading(false);
          return;
        }

        const { data: patientProfile } = await supabase.from('patient_profiles').select('id').eq('user_id', user.id).maybeSingle();
        if (patientProfile) {
          setPatientProfileId(patientProfile.id);
          const { data: doctorProfiles } = await supabase
            .from('doctor_profiles')
            .select('id, user_id, specialty, bio, consultation_fee')
            .order('id');

          if (doctorProfiles) {
            const userIds = doctorProfiles.map(d => d.user_id);
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url')
              .in('user_id', userIds);

            const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]));

            setDoctors(doctorProfiles.map((d: any) => {
              const profile = profilesMap.get(d.user_id);
              // DEBUG: Check photo URLs
              if (!profile?.avatar_url) console.warn(`Missing photo for doctor ${d.id} (${profile?.full_name})`);

              return {
                doctorProfileId: d.id,
                doctorName: profile?.full_name || 'Doctor',
                specialty: d.specialty,
                bio: d.bio,
                consultationFee: d.consultation_fee,
                doctorPhoto: profile?.avatar_url,
                university: d.university
              };
            }));
          }
          await loadPatientAppointments(patientProfile.id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [user, roles, authLoading]);

  const handleCancel = async (appointmentId: string, startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const hoursDifference = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      toast.warning('Política de Cancelación', {
        description: 'Solo con 24h de antelación.',
        action: {
          label: 'Contactar',
          onClick: () => window.open('https://wa.me/573001234567', '_blank')
        }
      });
      return;
    }

    const success = await cancelAppointment(appointmentId, hasRole('doctor') ? 'Cancelado por el médico' : 'Cancelado por el paciente');
    if (success) {
      if (patientProfileId) loadPatientAppointments(patientProfileId);
    }
  };

  const handleBookingSuccess = () => {
    if (patientProfileId) {
      loadPatientAppointments(patientProfileId);
      setSelectedDoctor(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const allAppointments = myAppointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: MAIN CONTENT */}
          <div className="lg:col-span-8 space-y-10">

            {/* Steps Banner - LANDING STYLE (Gradient) */}
            {!hasRole('doctor') && !selectedDoctor && (
              <section className="bg-white rounded-3xl p-1 shadow-lg border-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500">
                <div className="bg-white rounded-[1.4rem] p-8 md:p-10 h-full">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Centro de Bienestar</h2>
                      <p className="text-slate-500 text-sm font-medium">Gestiona tu salud con excelencia.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { title: 'Selecciona', desc: 'Tu especialista ideal.', icon: Stethoscope },
                      { title: 'Agenda', desc: 'Reserva tu espacio.', icon: CalendarDays },
                      { title: 'Consulta', desc: 'Atención integral.', icon: CheckCircle2 }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 items-start group">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-teal-600 group-hover:bg-gradient-to-br group-hover:from-teal-500 group-hover:to-cyan-500 group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-sm">
                          <item.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{item.title}</h3>
                          <p className="text-sm text-slate-500 leading-snug mt-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Doctors Section - LANDING CARDS */}
            {!hasRole('doctor') && !selectedDoctor && (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    Especialistas Disponibles
                    <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {doctors.map((doc) => (
                    <div
                      key={doc.doctorProfileId}
                      className="bg-white rounded-3xl p-6 shadow-md hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 cursor-pointer group flex flex-col h-full border border-slate-100 hover:border-teal-200"
                      onClick={() => setSelectedDoctor(doc)}
                    >
                      <div className="flex items-center gap-5 mb-5">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-50 to-white border-2 border-white shadow-lg flex items-center justify-center text-slate-400 group-hover:text-teal-600 group-hover:scale-105 transition-all overflow-hidden">
                          {doc.doctorPhoto ? (
                            <img src={doc.doctorPhoto} alt={doc.doctorName} className="h-full w-full object-cover" />
                          ) : (
                            <UserCircle className="h-9 w-9" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-teal-600 transition-colors">{doc.doctorName}</h4>
                          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block mt-1">
                            {doc.specialty}
                          </span>
                          {doc.university && (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                              <GraduationCap className="h-3 w-3" />
                              {doc.university}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow line-clamp-3 font-medium">
                        "{doc.bio || 'Especialista comprometido con el bienestar integral del paciente.'}"
                      </p>

                      <Button className="w-full bg-slate-900 group-hover:bg-gradient-to-r group-hover:from-teal-500 group-hover:to-cyan-500 text-white rounded-xl h-12 font-bold transition-all shadow-lg shadow-slate-200 group-hover:shadow-teal-500/20 border-0">
                        Ver Disponibilidad
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking flow - LIGHT */}
            {selectedDoctor && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <Button variant="ghost" className="mb-4 pl-0 text-slate-500 hover:text-teal-600 hover:bg-transparent transition-colors" onClick={() => setSelectedDoctor(null)}>
                  <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Regresar al directorio
                </Button>
                <div className="bg-white rounded-[2rem] shadow-xl p-8 lg:p-10 border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500" />
                  <div className="mb-8 border-b border-slate-100 pb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Agendar Cita</h2>
                    <p className="text-slate-500 mt-1">Con el Dr. <span className="font-bold text-teal-600">{selectedDoctor.doctorName}</span></p>
                  </div>
                  {patientProfileId && (
                    <AppointmentBooking
                      doctorId={selectedDoctor.doctorProfileId}
                      patientId={patientProfileId}
                      doctorName={selectedDoctor.doctorName}
                      doctorPhoto={selectedDoctor.doctorPhoto}
                      consultationFee={selectedDoctor.consultationFee}
                      specialty={selectedDoctor.specialty}
                      university={selectedDoctor.university}
                      onSuccess={handleBookingSuccess}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: SIDEBAR (Agenda) - LANDING STYLE */}
          <div className={cn("lg:col-span-4", hasRole('doctor') && "lg:col-span-12")}>
            <aside className={cn("sticky top-24", hasRole('doctor') && "static")}>
              <div className={cn(
                "bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden",
                hasRole('doctor') ? "min-h-[600px]" : "h-[calc(100vh-140px)]"
              )}>

                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-800 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                        <Clock className="h-4 w-4" />
                      </span>
                      <span>{hasRole('doctor') ? 'Mi Agenda de Citas' : 'Mi Agenda'}</span>
                    </h3>
                    {hasRole('doctor') && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-11"><span>Solo citas activas</span></p>
                    )}
                  </div>
                </div>

                {hasRole('doctor') && (
                  <div className="mx-6 mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-900 leading-tight"><span>Gestión de Cancelaciones</span></p>
                      <p className="text-[10px] text-amber-700/80 font-medium mt-0.5">
                        <span>Si requieres cancelar una cita, por favor solicita la gestión directamente con Soporte Administrativo.</span>
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50 text-[10px] font-bold gap-1.5 shadow-sm"
                        onClick={() => window.open('https://wa.me/573123456789', '_blank')}
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>CONTACTAR SOPORTE (WHATSAPP)</span>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 pb-20">
                  {allAppointments.length > 0 ? (
                    <div className={cn("grid grid-cols-1 gap-4", hasRole('doctor') && "md:grid-cols-2 lg:grid-cols-3")}>
                      {allAppointments.map((apt) => (
                        <div key={apt.id} className="group relative">
                          {/* Card */}
                          <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-teal-200 transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden h-full flex flex-col">
                            {/* Side accent */}
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1",
                              apt.status === 'confirmed' ? "bg-emerald-400" :
                                apt.status === 'completed' ? "bg-blue-400" : "bg-slate-200"
                            )} />

                            {/* Date/Time */}
                            <div className="flex justify-between items-start mb-3 pl-3">
                              <div>
                                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-0.5">
                                  <span>{format(new Date(apt.start_time), 'EEEE d, MMM', { locale: es })}</span>
                                </p>
                                <p className="text-xl font-bold text-slate-800 tracking-tight">
                                  <span>{format(new Date(apt.start_time), 'h:mm a')}</span>
                                </p>
                              </div>
                              <Badge className={cn(
                                "rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border shadow-none",
                                apt.status === 'confirmed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                  apt.status === 'completed' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-100 text-slate-500"
                              )}>
                                <span>{apt.status === 'completed' ? 'FINALIZADA' : apt.status}</span>
                              </Badge>
                            </div>

                            {/* Doctor / Patient Name */}
                            <div className="flex items-center gap-3 mb-4 pl-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-white shadow-sm">
                                {hasRole('doctor') ? (
                                  (apt as any).patientPhoto ? (
                                    <img src={(apt as any).patientPhoto} alt="Patient" className="h-full w-full object-cover" />
                                  ) : (
                                    <UserCircle className="h-5 w-5" />
                                  )
                                ) : (apt as any).doctorPhoto ? (
                                  <img src={(apt as any).doctorPhoto} alt="Doctor" className="h-full w-full object-cover" />
                                ) : (
                                  <UserCircle className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700 leading-none">
                                  <span>{hasRole('doctor') ? apt.patientName : `Dr. ${apt.doctorName}`}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                                  <span>{apt.is_virtual ? 'Virtual' : (apt.roomName || 'Presencial')}</span>
                                </p>
                              </div>
                            </div>

                            {/* Notes if any */}
                            {hasRole('doctor') && apt.notes && (
                              <div className="mb-4 pl-3">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                  <span>Motivo / Notas</span>
                                </p>
                                <p className="text-xs text-slate-600 line-clamp-2 italic">
                                  <span>{apt.notes}</span>
                                </p>
                              </div>
                            )}

                            {/* COMPLETED APPOINTMENT - MEDICAL REPORT */}
                            {apt.status === 'completed' && apt.clinical_entry && (
                              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-500 mb-4 ml-3">
                                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                  <ClipboardList className="h-3.5 w-3.5 text-teal-600" />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Resumen Clínico</span>
                                  </span>
                                </div>

                                {apt.clinical_entry.diagnosis && (
                                  <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Diagnóstico</span>
                                    <p className="text-xs font-medium text-slate-800">{apt.clinical_entry.diagnosis}</p>
                                  </div>
                                )}

                                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Plan / Tareas</span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                    {apt.clinical_entry.treatment_plan || 'Sin tareas asignadas.'}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="grid grid-cols-1 gap-2 pl-3 mt-auto">
                              {apt.is_virtual && ['confirmed'].includes(apt.status) && (() => {
                                const startTime = new Date(apt.start_time).getTime();
                                const now = new Date().getTime();
                                const fifteenMinutes = 15 * 60 * 1000;
                                const isTooEarly = now < (startTime - fifteenMinutes);

                                if (isTooEarly) {
                                  return (
                                    <div className="relative group/tooltip w-full">
                                      <Button
                                        className="w-full bg-slate-100 text-slate-400 rounded-xl h-9 text-xs font-bold border-0 cursor-not-allowed"
                                        disabled
                                      >
                                        <Video className="h-3.5 w-3.5 mr-1.5" /> <span>{hasRole('doctor') ? 'Iniciar Cita' : 'Unirse'}</span>
                                      </Button>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                        <span>Habilitado 15 min antes</span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <Button
                                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:to-teal-600 text-white rounded-xl h-9 text-xs font-bold transition-all shadow-md shadow-teal-500/20 border-0"
                                    onClick={() => window.open((apt as any).meeting_url || `https://meet.jit.si/CorpoOriente-${apt.id}`, '_blank')}
                                  >
                                    <Video className="h-3.5 w-3.5 mr-1.5" /> <span>{hasRole('doctor') ? 'Iniciar Cita' : 'Unirse'}</span>
                                  </Button>
                                );
                              })()}
                              {apt.status !== 'completed' && apt.status !== 'finalized' && (
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full text-xs h-8 rounded-lg font-bold transition-all",
                                    hasRole('doctor')
                                      ? "text-slate-300 cursor-not-allowed border-slate-100 bg-slate-50"
                                      : "text-slate-400 hover:text-rose-500 hover:bg-rose-50 border-slate-100 border hover:border-rose-200"
                                  )}
                                  onClick={() => !hasRole('doctor') && handleCancel(apt.id, apt.start_time)}
                                  disabled={hasRole('doctor')}
                                >
                                  {hasRole('doctor') ? 'CONTACTAR ADMIN PARA CANCELAR' : 'CANCELAR'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <CalendarDays className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin Citas Pendientes</p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
