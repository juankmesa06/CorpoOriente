import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Stethoscope, CalendarDays, Users, Building2, AlertTriangle, MessageSquare, ClipboardCheck, ArrowRight, FolderOpen, PenTool, Phone, TrendingUp, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { DoctorTasks } from './DoctorTasks';
import { DoctorRentals } from './DoctorRentals';
import { DoctorPayments } from './DoctorPayments';
import { PatientDetailsSidebar } from './PatientDetailsSidebar';
import { DoctorActivePatients } from './DoctorActivePatients';
import { PatientNameDisplay } from './PatientNameDisplay';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DoctorDashboardProps {
    isProfileIncomplete: boolean;
}

const DoctorDashboard = ({ isProfileIncomplete }: DoctorDashboardProps) => {
    const { user } = useAuth();
    const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
    const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
    const [doctorName, setDoctorName] = useState('');
    const [patientNames, setPatientNames] = useState<Record<string, string>>({});
    const [selectedAppointmentForRental, setSelectedAppointmentForRental] = useState<any>(null);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [isPatientSidebarOpen, setIsPatientSidebarOpen] = useState(false);
    const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
    const [totalConsultations, setTotalConsultations] = useState(0);
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

            const { data: doctorProfile } = await supabase.from('doctor_profiles').select('id').eq('user_id', user.id).maybeSingle();

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

                const { data } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('doctor_id', doctorProfile.id)
                    .gte('start_time', today.toISOString())
                    .neq('status', 'cancelled')
                    .order('start_time', { ascending: true })
                    .limit(5);

                const appointmentsWithRentals = data?.map((apt: any) => ({
                    ...apt,
                    room_rentals: apt.rental_id ? [{ id: apt.rental_id }] : []
                })) || [];

                setUpcomingAppointments(appointmentsWithRentals);

                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const { data: weeklyApts } = await supabase
                    .from('appointments')
                    .select('start_time, status')
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
            }
        };
        fetchData();
    }, [user]);

    return (
        <div className="space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl">
            {/* Header Banner - Teal Theme */}
            <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-slate-900 text-white p-8 rounded-2xl shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                            <Stethoscope className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Dr. {doctorName || user?.email?.split('@')[0]}</h1>
                            <p className="text-teal-100">Panel Clínico</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                            <p className="text-lg font-medium">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
                            <p className="text-sm text-teal-100">{format(new Date(), "hh:mm a")}</p>
                        </div>
                        <Button
                            onClick={() => setIsRentalDialogOpen(true)}
                            className="bg-white text-teal-700 hover:bg-teal-50 font-semibold shadow-lg transition-all hover:scale-105"
                        >
                            <Building2 className="mr-2 h-4 w-4" />
                            Alquilar Espacio
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <CalendarDays className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                                <p className="text-xs text-teal-100">Citas Próximas</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalConsultations}</p>
                                <p className="text-xs text-teal-100">Esta Semana</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{completionRate}%</p>
                                <p className="text-xs text-teal-100">Completadas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Agenda */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="border-0 shadow-xl bg-white h-full">
                        <CardHeader className="border-b bg-slate-50">
                            <CardTitle className="text-xl text-slate-900">Próximas Citas</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {upcomingAppointments.length === 0 ? (
                                <div className="text-center py-8 text-slate-600">
                                    <p>No hay citas programadas.</p>
                                    <Button variant="link" className="mt-2 text-teal-600">Ver agenda completa</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingAppointments.map((apt) => (
                                        <div key={apt.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-teal-300 transition-all">
                                            <div className="flex flex-col items-center bg-white p-3 rounded-lg shadow-sm min-w-[60px]">
                                                <span className="font-bold text-lg text-teal-600">{format(new Date(apt.start_time), 'd')}</span>
                                                <span className="text-xs text-slate-500 uppercase">{format(new Date(apt.start_time), 'MMM', { locale: es })}</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-900">
                                                    <PatientNameDisplay patientId={apt.patient_id} />
                                                </p>
                                                <p className="text-sm text-slate-600">{apt.notes || 'Consulta General'}</p>
                                                <p className="text-sm font-medium text-teal-600 mt-1">{format(new Date(apt.start_time), 'HH:mm')}</p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {apt.is_virtual ? (
                                                    (() => {
                                                        const now = new Date();
                                                        const start = new Date(apt.start_time);
                                                        const timeDiff = start.getTime() - now.getTime();
                                                        const isTooEarly = timeDiff > 60 * 60 * 1000;

                                                        return (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={isTooEarly}
                                                                className={`text-xs ${isTooEarly ? 'opacity-50' : 'border-teal-200 text-teal-600 hover:bg-teal-50'}`}
                                                                onClick={() => !isTooEarly && window.open(`https://meet.jit.si/CorpoOriente-${apt.id}`, '_blank')}
                                                            >
                                                                Unirse
                                                            </Button>
                                                        );
                                                    })()
                                                ) : (
                                                    (apt.rental_id || (apt.room_rentals && apt.room_rentals.length > 0) || apt.status === 'paid') ? (
                                                        <Link to={`/medical-record?id=${apt.patient_id}&appointment_id=${apt.id}&consultation=true`}>
                                                            <Button size="sm" className="text-xs bg-teal-600 hover:bg-teal-700 text-white">
                                                                Iniciar Cita
                                                            </Button>
                                                        </Link>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                                            onClick={() => setSelectedAppointmentForRental({
                                                                id: apt.id,
                                                                patient_name: apt.patient_profiles?.profiles?.full_name || 'Paciente',
                                                                start_time: apt.start_time,
                                                                end_time: apt.end_time
                                                            })}
                                                        >
                                                            Alquilar Espacio
                                                        </Button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>

                        <div className="p-6 border-t">
                            <DoctorActivePatients
                                onSelectPatient={(id) => {
                                    setSelectedPatientId(id);
                                    setIsPatientSidebarOpen(true);
                                }}
                            />
                        </div>
                    </Card>
                </div>

                {/* Center Column: Stats */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="border-0 shadow-xl bg-white">
                        <CardHeader className="border-b bg-slate-50">
                            <CardTitle className="text-xl text-slate-900">Rendimiento Semanal</CardTitle>
                            <CardDescription>Últimos 7 días</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={weeklyStats}>
                                        <defs>
                                            <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="consultas" stroke="#0d9488" fillOpacity={1} fill="url(#colorConsultas)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                                    <div className="text-2xl font-bold text-teal-700">{totalConsultations}</div>
                                    <div className="text-xs text-teal-600 font-medium">Consultas (7 días)</div>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <div className="text-2xl font-bold text-emerald-700">{completionRate}%</div>
                                    <div className="text-xs text-emerald-600 font-medium">Completadas</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Tasks */}
                <div className="md:col-span-4 flex flex-col gap-6">
                    <DoctorTasks className="max-h-[350px]" />
                    <DoctorRentals className="flex-1 min-h-[300px]" />
                </div>
            </div>

            {/* Financial Management */}
            <div id="financial-management" className="pt-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <FolderOpen className="h-6 w-6 text-teal-600" />
                    Gestión Financiera
                </h2>
                <DoctorPayments />
            </div>

            {/* Dialogs */}
            <Dialog open={!!selectedAppointmentForRental} onOpenChange={(open) => !open && setSelectedAppointmentForRental(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Confirmar Espacio para Cita</DialogTitle>
                    </DialogHeader>
                    {selectedAppointmentForRental && (
                        <RoomRentalBooking
                            appointment={selectedAppointmentForRental}
                            onSuccess={handleRentalSuccess}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <PatientDetailsSidebar
                open={isPatientSidebarOpen}
                onOpenChange={setIsPatientSidebarOpen}
                patientId={selectedPatientId}
            />
        </div>
    );
};

export default DoctorDashboard;
