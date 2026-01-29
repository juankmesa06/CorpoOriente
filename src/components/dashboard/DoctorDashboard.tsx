import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Stethoscope, CalendarDays, Users, Building2, AlertTriangle, MessageSquare, ClipboardCheck, ArrowRight, FolderOpen, PenTool, Phone, TrendingUp, Activity, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { DoctorTasks } from './DoctorTasks';
import { DoctorRentals } from './DoctorRentals';
import { DoctorWallet } from './DoctorWallet';
import { DoctorRoomRentals } from './DoctorRoomRentals';
import { DoctorPayments } from './DoctorPayments';
import { PatientDetailsSidebar } from './PatientDetailsSidebar';
import { DoctorActivePatients } from './DoctorActivePatients';
import { DoctorWeeklyStats } from './DoctorWeeklyStats';
import { PatientNameDisplay } from './PatientNameDisplay';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { StaffSecurityPanel } from './StaffSecurityPanel';

interface DoctorDashboardProps {
    isProfileIncomplete: boolean;
}

const DoctorDashboard = ({ isProfileIncomplete }: DoctorDashboardProps) => {
    const { user } = useAuth();
    const [view, setView] = useState<'dashboard' | 'security' | 'payments'>('dashboard');
    const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
    const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
    const [doctorName, setDoctorName] = useState('');
    const [patientNames, setPatientNames] = useState<Record<string, string>>({});
    const [selectedAppointmentForRental, setSelectedAppointmentForRental] = useState<any>(null);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [isPatientSidebarOpen, setIsPatientSidebarOpen] = useState(false);
    const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
    const [totalConsultations, setTotalConsultations] = useState(0);
    const [weeklyEarnings, setWeeklyEarnings] = useState(0);
    const [completionRate, setCompletionRate] = useState(0);

    const handleRentalSuccess = () => {
        setIsRentalDialogOpen(false);
        setSelectedAppointmentForRental(null);
        window.location.reload();
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();
            if (profile?.full_name) {
                setDoctorName(profile.full_name);
            }

            const { data: doctorProfile } = await supabase.from('doctor_profiles').select('id, consultation_fee').eq('user_id', user.id).maybeSingle();

            if (doctorProfile) {
                const { data: relationships } = await supabase
                    .from('doctor_patients')
                    .select(`
                        patient_id,
                        patient_profiles!inner(
                            profiles:profiles!inner(full_name)
                        )
                    `)
                    .eq('doctor_id', doctorProfile.id);

                const namesMap: Record<string, string> = {};
                if (relationships) {
                    relationships.forEach((rel: any) => {
                        if (rel.patient_profiles?.profiles?.full_name) {
                            namesMap[rel.patient_id] = rel.patient_profiles.profiles.full_name;
                        }
                    });
                }
                setPatientNames(namesMap);

                // Get start of today to show all today's appointments regardless of time
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const { data } = await supabase
                    .from('appointments')
                    .select(`
                        *,
                        created_at,
                        room_rentals:rental_id (
                            rooms (
                                name
                            )
                        )
                    `)
                    .eq('doctor_id', doctorProfile.id)
                    .gte('start_time', today.toISOString())
                    .lt('start_time', tomorrow.toISOString())
                    .not('status', 'in', '("cancelled","completed")')
                    .order('start_time', { ascending: true })
                    .limit(5);

                setUpcomingAppointments(data || []);

                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const { data: weeklyApts } = await supabase
                    .from('appointments')
                    .select('start_time, status, payments(amount)')
                    .eq('doctor_id', doctorProfile.id)
                    .gte('start_time', sevenDaysAgo.toISOString())
                    .neq('status', 'cancelled');

                if (weeklyApts) {
                    const daysMap: Record<string, number> = { 'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0, 'Sáb': 0, 'Dom': 0 };
                    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

                    let total = 0;
                    let completed = 0;
                    weeklyApts.forEach(apt => {
                        const date = new Date(apt.start_time);
                        const dayName = days[date.getDay()];
                        if (daysMap[dayName] !== undefined) {
                            daysMap[dayName]++;
                        }
                        total++;
                        if (apt.status === 'completed') completed++;
                    });

                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                    setCompletionRate(rate);

                    const chartData = [
                        { name: 'Lun', consultas: daysMap['Lun'] },
                        { name: 'Mar', consultas: daysMap['Mar'] },
                        { name: 'Mié', consultas: daysMap['Mié'] },
                        { name: 'Jue', consultas: daysMap['Jue'] },
                        { name: 'Vie', consultas: daysMap['Vie'] },
                        { name: 'Sáb', consultas: daysMap['Sáb'] },
                        { name: 'Dom', consultas: daysMap['Dom'] },
                    ];

                    setWeeklyStats(chartData);
                    setTotalConsultations(total);
                }

                // Calculate Weekly Earnings from the already fetched weeklyApts
                if (weeklyApts) {
                    const earnings = weeklyApts.reduce((sum, apt: any) => {
                        // Check if appointment is valid for earnings (completed, confirmed, or paid)
                        if (['completed', 'confirmed'].includes(apt.status) || (apt.payments && apt.payments.length > 0)) {
                            // Use payment amount if available (with fallback for the 500 bug), otherwise use consultation fee
                            const rawAmount = Number(apt.payments?.[0]?.amount);
                            const paymentAmount = (rawAmount === 500)
                                ? (doctorProfile.consultation_fee || 150000)
                                : (rawAmount || doctorProfile.consultation_fee || 0);
                            return sum + Number(paymentAmount);
                        }
                        return sum;
                    }, 0);
                    setWeeklyEarnings(earnings);
                }
            }
        };
        fetchData();
    }, [user]);

    return (
        <div className="space-y-8 min-h-screen bg-slate-50/50 p-6 rounded-3xl">
            {/* Header with Greeting */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        {view === 'dashboard' ? (
                            <>
                                Hola, Dr. {doctorName.split(' ')[0]}
                                <span className="text-2xl animate-bounce delay-100">👋</span>
                            </>
                        ) : view === 'security' ? 'Seguridad y Accesos' : 'Tus Pagos y Facturación'}
                    </h1>
                    {view === 'dashboard' && (
                        <p className="text-slate-500 mt-1 font-medium">Aquí tienes el resumen de tu actividad de hoy.</p>
                    )}
                </div>
                <div className="flex gap-3">
                    {view === 'dashboard' ? (
                        <Button
                            variant="outline"
                            onClick={() => setView('security')}
                            className="border-slate-200 text-slate-600 hover:bg-white hover:text-teal-600 hover:border-teal-200 transition-all rounded-full px-6 shadow-sm"
                        >
                            Crear contraseña
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={() => setView('dashboard')}
                            className="text-slate-600 hover:bg-slate-100 rounded-full"
                        >
                            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                            Volver al Panel
                        </Button>
                    )}
                </div>
            </div>

            {/* Security View */}
            <div className={view === 'security' ? 'block' : 'hidden'}>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <StaffSecurityPanel />
                </div>
            </div>

            {/* Payments View */}
            <div className={view === 'payments' ? 'block' : 'hidden'}>
                <DoctorPayments />
            </div>

            {/* Dashboard View - Fresh 2-Column Layout */}
            <div className={view === 'dashboard' ? 'grid grid-cols-1 lg:grid-cols-12 gap-8' : 'hidden'}>

                {/* LEFT COLUMN (MAIN) - 8 COLS */}
                <div className="lg:col-span-8 space-y-8">

                    {/* 1. Agenda (Moved to TOP) */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <CalendarDays className="h-6 w-6 text-teal-600" />
                                Agenda del Día
                            </h3>
                            <span className="text-sm font-medium text-slate-500">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</span>
                        </div>
                        <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden border-slate-100">
                            <CardContent className="p-0">
                                {upcomingAppointments.length === 0 ? (
                                    <div className="text-center py-12 px-6">
                                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CalendarDays className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-900">Agenda Libre</h4>
                                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">No tienes citas programadas para hoy.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {upcomingAppointments.map((apt) => (
                                            <div key={apt.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-5 items-center group">
                                                {/* Time Badge */}
                                                <div className="flex flex-col items-center justify-center bg-white border-2 border-slate-100 text-slate-700 rounded-2xl w-16 h-16 shrink-0 group-hover:border-teal-200 group-hover:text-teal-700 transition-colors">
                                                    <span className="text-lg font-extrabold">
                                                        {format(new Date(apt.start_time), 'h:mm')}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-teal-500">
                                                        {format(new Date(apt.start_time), 'a')}
                                                    </span>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 w-full text-center md:text-left">
                                                    <h4 className="font-bold text-slate-900 text-base md:text-lg">
                                                        <PatientNameDisplay patientId={apt.patient_id} />
                                                    </h4>
                                                    <div className="text-sm text-slate-500 mt-1 font-medium flex flex-col md:flex-row items-center md:items-start md:gap-2">
                                                        <span className="text-teal-600 font-semibold uppercase text-xs tracking-wide">
                                                            {format(new Date(apt.start_time), 'EEE, d MMM', { locale: es })}
                                                        </span>
                                                        <span className="hidden md:inline text-slate-300">•</span>
                                                        <span>
                                                            {apt.is_virtual ? 'Consulta Virtual' : (apt.notes || 'Consulta General')} {apt.room_rentals?.rooms?.name ? `• ${apt.room_rentals.rooms.name}` : ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="shrink-0 w-full md:w-auto flex flex-col gap-2">
                                                    {/* Hide Rental button if it's a patient appointment OR it's already paid/confirmed/rented */}
                                                    {(apt.rental_id || (apt.room_rentals && apt.room_rentals.length > 0) || apt.status === 'paid' || apt.status === 'confirmed' || apt.patient_id) ? (
                                                        (() => {
                                                            const startTime = new Date(apt.start_time).getTime();
                                                            const now = new Date().getTime();
                                                            const fiveMinutes = 5 * 60 * 1000;
                                                            const isTooEarly = now < (startTime - fiveMinutes);

                                                            if (isTooEarly) {
                                                                return (
                                                                    <div className="relative group/tooltip">
                                                                        <Button disabled className="w-full md:w-auto rounded-xl bg-slate-100 text-slate-400 h-10 px-5 text-sm font-medium cursor-not-allowed">
                                                                            {apt.is_virtual ? 'Iniciar Consulta' : 'Iniciar Consulta'}
                                                                        </Button>
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                                            Habilitado 5 min antes
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <Link to={`/medical-record?id=${apt.patient_id}&appointment_id=${apt.id}&consultation=true`} className="w-full md:w-auto">
                                                                    <Button className="w-full md:w-auto rounded-xl bg-slate-900 text-white hover:bg-teal-600 transition-colors h-10 px-5 text-sm font-medium">
                                                                        {apt.is_virtual ? 'Iniciar Consulta' : 'Iniciar Consulta'}
                                                                    </Button>
                                                                </Link>
                                                            );
                                                        })()
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            className="w-full md:w-auto rounded-xl border-amber-200 text-amber-500 hover:bg-amber-50 h-10 px-5 text-sm font-medium"
                                                            onClick={() => {
                                                                setSelectedAppointmentForRental({
                                                                    id: apt.id,
                                                                    patient_name: apt.patient_profiles?.profiles?.full_name || 'Paciente',
                                                                    start_time: apt.start_time,
                                                                    end_time: apt.end_time
                                                                });
                                                                setIsRentalDialogOpen(true);
                                                            }}
                                                        >
                                                            Alquilar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div id="finances">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-indigo-600" />
                                Finanzas
                            </h3>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 font-bold text-[10px] gap-1.5"
                                    onClick={() => setView('payments')}
                                >
                                    <Wallet className="h-3 w-3" />
                                    VER PAGOS
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 font-bold text-[10px] gap-1.5"
                                    onClick={() => window.open('https://wa.me/573123456789?text=Hola,%20necesito%20soporte%20con%20un%20reclamo%20de%20pagos.', '_blank')}
                                >
                                    <MessageSquare className="h-3 w-3" />
                                    RECLAMOS / SOPORTE
                                </Button>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-1 overflow-hidden transition-all hover:shadow-md">
                            <DoctorWallet />
                        </div>
                    </div>

                    {/* 3. Stats Row (Bottom) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Semanal</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-slate-900">{totalConsultations}</p>
                                <p className="text-xs text-slate-400 mt-1">Consultas realizadas</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Efectividad</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-slate-900">{completionRate}%</p>
                                <p className="text-xs text-slate-400 mt-1">Tasa de finalización</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-slate-50 transition-colors group h-full" onClick={() => {
                            setSelectedAppointmentForRental(null);
                            setIsRentalDialogOpen(true);
                        }}>
                            <div className="p-4 bg-teal-50 rounded-full text-teal-600 group-hover:scale-110 transition-transform mb-3">
                                <Building2 className="h-7 w-7" />
                            </div>
                            <p className="font-bold text-teal-700 text-sm">Reservar Espacio</p>
                        </div>
                    </div>
                    {/* Weekly Activity Chart */}
                    <DoctorWeeklyStats />
                </div>

                {/* RIGHT COLUMN (SIDEBAR) - 4 COLS */}
                <div className="lg:col-span-4 space-y-8">

                    {/* NEW: Independent Rental Card */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-200 hover:scale-[1.02] transition-transform duration-300">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-teal-500/20 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 rounded-full bg-indigo-500/20 blur-2xl"></div>

                        <div className="relative z-10 p-8 flex flex-col items-start gap-6 h-full">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                                    <Building2 className="h-8 w-8 text-teal-300" />
                                </div>
                                <h3 className="text-xl font-bold text-white leading-tight">¿Necesitas un<br />Consultorio?</h3>
                            </div>

                            <p className="text-slate-300 text-sm leading-relaxed">
                                Reserva espacios por horas para tus consultas privadas o eventos médicos, sin necesidad de asociarlo a una cita.
                            </p>

                            <Button
                                onClick={() => {
                                    setSelectedAppointmentForRental(null);
                                    setIsRentalDialogOpen(true);
                                }}
                                className="w-full bg-white text-slate-900 hover:bg-teal-50 transition-colors font-bold h-12 rounded-xl"
                            >
                                Reservar Ahora
                            </Button>
                        </div>
                    </div>

                    {/* My Room Rentals List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <DoctorRoomRentals />
                    </div>

                    {/* Active Patients */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Users className="h-5 w-5 text-indigo-500" />
                                Pacientes Activos
                            </h3>
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">EN SALA</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">Gestiona tus pacientes actuales sin salir del panel.</p>
                        <DoctorActivePatients
                            onSelectPatient={(id) => {
                                setSelectedPatientId(id);
                                setIsPatientSidebarOpen(true);
                            }}
                            hideHeader={true}
                        />
                    </div>

                    {/* Tasks */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <ClipboardCheck className="h-5 w-5 text-teal-600" />
                            Tus Pendientes
                        </h3>
                        <DoctorTasks className="shadow-none border-0 bg-transparent" hideHeader={true} />
                    </div>

                    {/* NEW: General Support / Reception Card */}
                    <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <Phone className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-emerald-900">Atención al Médico</h3>
                        </div>
                        <p className="text-sm text-emerald-700/80 mb-4">¿Tienes alguna duda o reclamo? Comunícate directamente con recepción.</p>
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 gap-2 shadow-sm"
                            onClick={() => window.open('https://wa.me/573123456789?text=Hola,%20soy%20el%20Dr.%20necesito%20comunicarme%20con%20recepción.', '_blank')}
                        >
                            <MessageSquare className="h-4 w-4" />
                            Contactar Recepción
                        </Button>
                    </div>

                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={isRentalDialogOpen} onOpenChange={setIsRentalDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Reserva de Espacios</DialogTitle>
                    </DialogHeader>
                    {/* Always render RoomRentalBooking, it handles null appointment inside now */}
                    <RoomRentalBooking
                        appointment={selectedAppointmentForRental}
                        onSuccess={handleRentalSuccess}
                    />
                </DialogContent>
            </Dialog>

            <PatientDetailsSidebar
                open={isPatientSidebarOpen}
                onOpenChange={setIsPatientSidebarOpen}
                patientId={selectedPatientId}
            />
        </div >
    );
};

export default DoctorDashboard;
