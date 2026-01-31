import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReceptionistProfile } from '../profile/ReceptionistProfile';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Calendar,
    Clock,
    Search,
    UserCheck,
    Users,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Phone,
    Mail,
    MapPin,
    TrendingUp,
    CalendarCheck,
    Building2,
    User,
    Stethoscope,
    Bell,
    Activity,
    UserCog,
    KeyRound,
    MessageCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isToday, parseISO, addHours, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminPatientManager } from './AdminPatientManager';
import { AdminAppointmentBooking } from './AdminAppointmentBooking';
import { RoomRentalBooking } from '../rental/RoomRentalBooking';
import { ReceptionistDoctorManager } from './ReceptionistDoctorManager';
import { ReceptionistAppointmentManager } from './ReceptionistAppointmentManager';
import { StaffSecurityPanel } from './StaffSecurityPanel';

interface Appointment {
    id: string;
    start_time: string;
    end_time: string;
    status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    notes: string | null;
    patient_id: string;
    doctor_id: string;
    patient_profile?: {
        full_name: string;
        email: string;
        phone: string;
    };
    doctor_profile?: {
        full_name: string;
        specialty: string;
    };
}

interface Stats {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    checkedIn: number;
}

type Section = 'overview' | 'appointments' | 'patients' | 'doctors' | 'agenda' | 'rentals' | 'security' | 'profile';

interface DoctorAgendaItem {
    id: string;
    full_name: string;
    specialty: string;
    appointments: { id: string; start_time: string; end_time: string; status: string; patient_name: string }[];
}

const ReceptionistDashboard = () => {
    const [activeSection, setActiveSection] = useState<Section>('overview');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [agendaDate, setAgendaDate] = useState<Date>(new Date());
    const [doctorsAgenda, setDoctorsAgenda] = useState<DoctorAgendaItem[]>([]);
    const [loadingAgenda, setLoadingAgenda] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState<Stats>({
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        checkedIn: 0
    });
    const [confirmAction, setConfirmAction] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        loadTodayAppointments();

        // Refresh every 30 seconds
        const interval = setInterval(loadTodayAppointments, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDoctorsAgenda = async () => {
        setLoadingAgenda(true);
        const start = startOfDay(agendaDate);
        const end = addDays(start, 1); // fin del día para filtro
        try {
            const { data: doctorsData } = await supabase
                .from('doctor_profiles')
                .select('id, user_id, specialty')
                .order('specialty');
            const userIds = doctorsData?.map(d => d.user_id) || [];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', userIds);

            const { data: apts } = await supabase
                .from('appointments')
                .select('id, doctor_id, start_time, end_time, status, patient_id, external_patient_name')
                .gte('start_time', start.toISOString())
                .lt('start_time', end.toISOString())
                .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed']);

            const patientIds = [...new Set(apts?.map(a => a.patient_id).filter(Boolean) || [])];
            const { data: pp } = await supabase.from('patient_profiles').select('id, user_id').in('id', patientIds);
            const puIds = pp?.map(p => p.user_id) || [];
            const { data: pu } = puIds.length ? await supabase.from('profiles').select('user_id, full_name').in('user_id', puIds) : { data: [] };

            const getPatientName = (apt: { patient_id: string | null; external_patient_name: string | null }) => {
                if (apt.external_patient_name) return apt.external_patient_name;
                const p = pp?.find(x => x.id === apt.patient_id);
                return pu?.find(u => u.user_id === p?.user_id)?.full_name || 'Paciente';
            };

            const agenda: DoctorAgendaItem[] = (doctorsData || []).map(d => ({
                id: d.id,
                full_name: profiles?.find(p => p.user_id === d.user_id)?.full_name || 'Doctor',
                specialty: d.specialty || '',
                appointments: (apts || [])
                    .filter(a => a.doctor_id === d.id)
                    .map(a => ({
                        id: a.id,
                        start_time: a.start_time,
                        end_time: a.end_time,
                        status: a.status,
                        patient_name: getPatientName(a)
                    }))
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            }));
            setDoctorsAgenda(agenda);
        } catch (e) {
            toast.error('Error al cargar agenda');
        } finally {
            setLoadingAgenda(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'agenda') loadDoctorsAgenda();
    }, [activeSection, agendaDate]);

    const loadTodayAppointments = async () => {
        setLoading(true);
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data, error } = await supabase
            .from('appointments')
            .select(`
                id,
                start_time,
                end_time,
                status,
                notes,
                patient_id,
                external_patient_name,
                doctor_id
            `)
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .order('start_time', { ascending: true });

        if (error) {
            toast.error('Error al cargar citas: ' + error.message);
            setLoading(false);
            return;
        }

        // Get patient and doctor profiles
        const patientIds = [...new Set(data?.map(a => a.patient_id) || [])];
        const doctorIds = [...new Set(data?.map(a => a.doctor_id) || [])];

        // Get patient user_ids
        const { data: patientProfiles } = await supabase
            .from('patient_profiles')
            .select('id, user_id')
            .in('id', patientIds);

        // Get doctor user_ids
        const { data: doctorProfiles } = await supabase
            .from('doctor_profiles')
            .select('id, user_id, specialty')
            .in('id', doctorIds);

        // Get profiles
        const patientUserIds = patientProfiles?.map(p => p.user_id) || [];
        const doctorUserIds = doctorProfiles?.map(d => d.user_id) || [];

        const { data: patientUsers } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone')
            .in('user_id', patientUserIds);

        const { data: doctorUsers } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', doctorUserIds);

        const appointmentsWithProfiles = data?.map(apt => {
            const patientProfile = patientProfiles?.find(p => p.id === apt.patient_id);
            const doctorProfile = doctorProfiles?.find(d => d.id === apt.doctor_id);
            const patientUser = patientUsers?.find(u => u.user_id === patientProfile?.user_id);
            // Paciente externo: usar external_patient_name cuando patient_id es null
            const patientDisplay = apt.external_patient_name || patientUser?.full_name;

            return {
                ...apt,
                patient_profile: {
                    full_name: patientDisplay || 'Paciente',
                    email: patientUser?.email,
                    phone: patientUser?.phone
                },
                doctor_profile: {
                    full_name: doctorUsers?.find(u => u.user_id === doctorProfile?.user_id)?.full_name,
                    specialty: doctorProfile?.specialty
                }
            };
        }) as Appointment[] || [];

        setAppointments(appointmentsWithProfiles);

        // Calculate stats
        const total = appointmentsWithProfiles.length;
        const completed = appointmentsWithProfiles.filter(a => a.status === 'completed').length;
        const pending = appointmentsWithProfiles.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
        const cancelled = appointmentsWithProfiles.filter(a => a.status === 'cancelled').length;
        const checkedIn = appointmentsWithProfiles.filter(a => a.status === 'checked_in' || a.status === 'in_progress').length;

        setStats({ total, completed, pending, cancelled, checkedIn });
        setLoading(false);
    };



    const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
        const { error } = await supabase
            .from('appointments')
            .update({ status: newStatus } as any)
            .eq('id', appointmentId);

        if (error) {
            toast.error('Error al actualizar estado');
        } else {
            const msg = newStatus === 'confirmed' ? '✅ Asistencia confirmada' : '❌ Cita marcada como cancelada/no asiste';
            toast.success(msg);
            setConfirmAction(null);
            loadTodayAppointments();
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            scheduled: { label: 'Agendada', variant: 'secondary' as const, color: 'bg-slate-100 text-slate-700 border-slate-200' },
            confirmed: { label: 'Confirmada', variant: 'default' as const, color: 'bg-blue-100 text-blue-700 border-blue-200' },
            checked_in: { label: 'En Espera', variant: 'default' as const, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
            in_progress: { label: 'En Consulta', variant: 'default' as const, color: 'bg-purple-100 text-purple-700 border-purple-200' },
            completed: { label: 'Completada', variant: 'default' as const, color: 'bg-green-100 text-green-700 border-green-200' },
            cancelled: { label: 'Cancelada', variant: 'destructive' as const, color: 'bg-red-100 text-red-700 border-red-200' },
            no_show: { label: 'No Asistió', variant: 'destructive' as const, color: 'bg-orange-100 text-orange-700 border-orange-200' }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
        return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>;
    };

    const upcomingArrivals = useMemo(() => {
        const now = new Date();
        const twoHoursLater = addHours(now, 2);

        return appointments.filter(apt => {
            if (apt.status === 'completed' || apt.status === 'cancelled') return false;

            const aptDateTime = parseISO(apt.start_time);
            return aptDateTime >= now && aptDateTime <= twoHoursLater;
        }).slice(0, 5);
    }, [appointments]);

    const waitingRoom = useMemo(() => {
        return appointments.filter(apt => apt.status === 'checked_in' || apt.status === 'in_progress');
    }, [appointments]);

    const filteredAppointments = useMemo(() => {
        if (!searchQuery.trim()) return appointments;

        const query = searchQuery.toLowerCase();
        return appointments.filter(apt =>
            apt.patient_profile?.full_name?.toLowerCase().includes(query) ||
            apt.patient_profile?.email?.toLowerCase().includes(query) ||
            apt.doctor_profile?.full_name?.toLowerCase().includes(query) ||
            apt.doctor_profile?.specialty?.toLowerCase().includes(query)
        );
    }, [appointments, searchQuery]);

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Header with current time */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-teal-800 bg-clip-text text-transparent">
                        Resumen del Día
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                </div>

            </div>

            {/* Search Bar */}
            <Card className="border-teal-200 shadow-sm">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar paciente, doctor o especialidad..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 text-base"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <Calendar className="h-8 w-8 text-slate-600" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                        <p className="text-sm text-slate-600 mt-1">Citas Hoy</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <UserCheck className="h-8 w-8 text-yellow-600" />
                        </div>
                        <p className="text-3xl font-bold text-yellow-900">{stats.checkedIn}</p>
                        <p className="text-sm text-yellow-700 mt-1">En Espera</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="h-8 w-8 text-blue-600" />
                        </div>
                        <p className="text-3xl font-bold text-blue-900">{stats.pending}</p>
                        <p className="text-sm text-blue-700 mt-1">Pendientes</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-white border-green-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <p className="text-3xl font-bold text-green-900">{stats.completed}</p>
                        <p className="text-sm text-green-700 mt-1">Completadas</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-white border-red-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <p className="text-3xl font-bold text-red-900">{stats.cancelled}</p>
                        <p className="text-sm text-red-700 mt-1">Canceladas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline de Citas */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-100">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Activity className="h-5 w-5 text-teal-600" />
                                Agenda del Día ({searchQuery ? filteredAppointments.length : stats.total})
                            </CardTitle>
                            <CardDescription>
                                Todas las citas programadas para hoy
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <p className="text-center text-muted-foreground py-12">Cargando citas...</p>
                            ) : filteredAppointments.length === 0 ? (
                                <p className="text-center text-muted-foreground py-12">
                                    {searchQuery ? 'No se encontraron resultados' : 'No hay citas programadas para hoy'}
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                                    {filteredAppointments.map((apt) => (
                                        <div
                                            key={apt.id}
                                            className="p-4 hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                                        {apt.patient_profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'P'}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-semibold text-slate-900">
                                                                {apt.patient_profile?.full_name || 'Paciente'}
                                                            </p>
                                                            {getStatusBadge(apt.status)}
                                                        </div>

                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                <span>{format(parseISO(apt.start_time), 'hh:mm a')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Stethoscope className="h-3 w-3" />
                                                                <span>{apt.doctor_profile?.full_name}</span>
                                                            </div>
                                                            {apt.patient_profile?.phone && (
                                                                <div className="flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    <span>{apt.patient_profile.phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Actions - Confirmation instead of Check-in */}
                                                <div className="flex items-center gap-2">
                                                    {apt.patient_profile?.phone && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                                            onClick={() => {
                                                                const phone = apt.patient_profile?.phone?.replace(/\D/g, '') || '';
                                                                const message = `Hola ${apt.patient_profile?.full_name}, le recordamos su cita hoy a las ${format(parseISO(apt.start_time), 'hh:mm a')} con el/la Dr(a). ${apt.doctor_profile?.full_name} en Centro Psicoterapéutico de Oriente.`;
                                                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                                                            }}
                                                            title="Enviar recordatorio por WhatsApp"
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {apt.status === 'scheduled' ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setConfirmAction({ id: apt.id, name: apt.patient_profile?.full_name || 'Paciente' })}
                                                            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                                                        >
                                                            <UserCheck className="h-4 w-4 mr-1" />
                                                            Confirmar
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Confirmation Dialog */}
                <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmar Asistencia</DialogTitle>
                            <DialogDescription>
                                ¿El paciente <strong>{confirmAction?.name}</strong> ha confirmado que asistirá a la cita?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex gap-2 sm:justify-center">
                            <Button
                                variant="destructive"
                                onClick={() => confirmAction && handleStatusUpdate(confirmAction.id, 'cancelled')}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                No Vendrá / Cancelar
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => confirmAction && handleStatusUpdate(confirmAction.id, 'confirmed')}
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Sí, Confirmar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>


                {/* Sidebar */}
                < div className="space-y-4" >
                    {/* Próximas Llegadas */}
                    < Card className="border-blue-200 shadow-sm" >
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Bell className="h-4 w-4 text-blue-600" />
                                Próximas Llegadas
                            </CardTitle>
                            <CardDescription className="text-xs">Siguientes 2 horas</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {upcomingArrivals.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No hay llegadas próximas
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingArrivals.map((apt) => (
                                        <div key={apt.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                            <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-blue-900 truncate">
                                                    {apt.patient_profile?.full_name}
                                                </p>
                                                <p className="text-xs text-blue-700">
                                                    {format(parseISO(apt.start_time), 'hh:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card >

                    {/* Sala de Espera */}
                    < Card className="border-yellow-200 shadow-sm" >
                        <CardHeader className="bg-gradient-to-r from-yellow-50 to-white border-b border-yellow-100 pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-4 w-4 text-yellow-600" />
                                Sala de Espera
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {waitingRoom.length} paciente{waitingRoom.length !== 1 ? 's' : ''}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {waitingRoom.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No hay pacientes en espera
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {waitingRoom.map((apt) => (
                                        <div key={apt.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-8 w-8 rounded-full bg-yellow-600 flex items-center justify-center text-white text-xs font-bold">
                                                    {apt.patient_profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'P'}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-yellow-900">
                                                        {apt.patient_profile?.full_name}
                                                    </p>
                                                    <p className="text-xs text-yellow-700">
                                                        {format(parseISO(apt.start_time), 'hh:mm a')} - {apt.doctor_profile?.full_name}
                                                    </p>
                                                </div>
                                            </div>
                                            {getStatusBadge(apt.status)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card >
                </div >
            </div >
        </div >
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return renderOverview();
            case 'appointments':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Citas</h2>
                            <p className="text-muted-foreground">Agendamiento y control de consultas médicas.</p>
                        </div>
                        <AdminAppointmentBooking />
                    </div>
                );
            case 'rentals':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Alquiler de Espacios</h2>
                            <p className="text-muted-foreground">Gestiona reservas de consultorios y espacios.</p>
                        </div>
                        <RoomRentalBooking />
                    </div>
                );
            case 'patients':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Pacientes</h2>
                            <p className="text-muted-foreground">Administra los expedientes y datos de pacientes.</p>
                        </div>
                        <AdminPatientManager />
                    </div>
                );
            case 'doctors':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Médicos</h2>
                            <p className="text-muted-foreground">Consulta información y disponibilidad de médicos.</p>
                        </div>
                        <ReceptionistDoctorManager />
                    </div>
                );
            case 'agenda':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Agenda de Médicos</h2>
                                <p className="text-muted-foreground">Vista de disponibilidad por médico y día.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setAgendaDate(addDays(agendaDate, -1))}>
                                    ← Ayer
                                </Button>
                                <div className="px-4 py-2 rounded-lg bg-teal-50 border border-teal-200 font-medium text-teal-800 min-w-[180px] text-center">
                                    {format(agendaDate, "EEEE, d 'de' MMMM", { locale: es })}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setAgendaDate(addDays(agendaDate, 1))}>
                                    Mañana →
                                </Button>
                            </div>
                        </div>
                        {loadingAgenda ? (
                            <p className="text-center text-muted-foreground py-12">Cargando agenda...</p>
                        ) : (
                            <div className="space-y-4">
                                {doctorsAgenda.map((doc) => (
                                    <Card key={doc.id} className="border-teal-100 overflow-hidden">
                                        <CardHeader className="py-3 bg-gradient-to-r from-teal-50 to-white border-b border-teal-100">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <Stethoscope className="h-5 w-5 text-teal-600" />
                                                    Dr. {doc.full_name}
                                                </CardTitle>
                                                <Badge variant="outline">{doc.specialty}</Badge>
                                            </div>
                                            <CardDescription>
                                                {doc.appointments.length === 0
                                                    ? "Sin citas programadas — disponible"
                                                    : `${doc.appointments.length} cita(s) programada(s)`}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            {doc.appointments.length === 0 ? (
                                                <div className="py-6 text-center text-muted-foreground text-sm">
                                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                                    Disponible todo el día
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {doc.appointments.map((apt) => (
                                                        <div
                                                            key={apt.id}
                                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                                                        >
                                                            <Clock className="h-4 w-4 text-teal-600" />
                                                            <span className="font-mono font-medium">
                                                                {format(parseISO(apt.start_time), 'HH:mm')} - {format(parseISO(apt.end_time), 'HH:mm')}
                                                            </span>
                                                            <span className="text-slate-600">•</span>
                                                            <span className="text-slate-700">{apt.patient_name}</span>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {apt.status === 'scheduled' ? 'Agendada' : apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'checked_in' ? 'En espera' : apt.status === 'in_progress' ? 'En consulta' : apt.status === 'completed' ? 'Completada' : apt.status}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'security':
                return <StaffSecurityPanel />;
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Mi Perfil</h2>
                            <p className="text-muted-foreground">Actualiza tu foto e información de contacto.</p>
                        </div>
                        <ReceptionistProfile />
                    </div>
                );
            default:
                return null;
        }
    };

    const NavItem = ({ section, label, icon: Icon }: { section: Section; label: string; icon: any }) => (
        <button
            onClick={() => setActiveSection(section)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg ${activeSection === section
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-teal-50 hover:text-teal-900'
                }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">
            {/* Sidebar */}
            <aside className="w-full md:w-64 shrink-0">
                <div className="sticky top-24 space-y-2">
                    <div className="px-4 py-2 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recepción</h2>
                        <p className="text-xs text-muted-foreground">Panel de Atención</p>
                    </div>

                    <nav className="space-y-1">
                        <NavItem section="overview" label="Resumen del Día" icon={Activity} />
                        <NavItem section="appointments" label="Gestión de Citas" icon={CalendarCheck} />
                        <NavItem section="agenda" label="Agenda de Médicos" icon={CalendarCheck} />
                        <NavItem section="patients" label="Gestión de Pacientes" icon={Users} />
                        <NavItem section="doctors" label="Gestión de Médicos" icon={UserCog} />
                        <NavItem section="rentals" label="Alquiler de Espacios" icon={Building2} />
                        <div className="pt-2">
                            <NavItem section="profile" label="Mi Perfil" icon={User} />
                        </div>
                    </nav>

                    <div className="px-4 py-4 mt-8 bg-teal-50 rounded-xl mx-2 border border-teal-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Stethoscope className="h-4 w-4 text-teal-600" />
                            <p className="text-xs text-teal-800 font-medium">Acceso Rápido</p>
                        </div>
                        <p className="text-xs text-teal-600 leading-relaxed">
                            Use el resumen del día para check-in rápido y monitoreo de la sala de espera.
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-full">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default ReceptionistDashboard;
