import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Stethoscope, CalendarDays, Users, Building2, AlertTriangle, MessageSquare, ClipboardCheck, ArrowRight, FolderOpen, PenTool, Phone } from 'lucide-react';
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
    const [selectedAppointmentForRental, setSelectedAppointmentForRental] = useState<any>(null); // Type should be AppointmentForRental
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [isPatientSidebarOpen, setIsPatientSidebarOpen] = useState(false);
    const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
    const [totalConsultations, setTotalConsultations] = useState(0);
    const [completionRate, setCompletionRate] = useState(0);

    const handleRentalSuccess = () => {
        setIsRentalDialogOpen(false);
        setSelectedAppointmentForRental(null);
        // Refresh appointments to show "Iniciar Cita"
        // In a real app we'd refetch, here we can maybe reload or just wait for SWR/Tanstack Query but we have simple useEffect
        window.location.reload(); // Simple refresh for now to pick up the new rental_id
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            // Get Doctor Profile Info
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();
            if (profile?.full_name) {
                setDoctorName(profile.full_name);
            }

            const { data: doctorProfile } = await supabase.from('doctor_profiles').select('id').eq('user_id', user.id).single();

            if (doctorProfile) {
                // 1. Fetch Patients Map (Client-side join workaround)
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

                // 2. Fetch Appointments
                const { data } = await supabase
                    .from('appointments')
                    .select('*, room_rentals(id)')
                    .eq('doctor_id', doctorProfile.id)
                    .gte('start_time', new Date().toISOString())
                    .neq('status', 'completed')
                    .neq('status', 'cancelled')
                    .order('start_time', { ascending: true })
                    .limit(5);

                setUpcomingAppointments(data || []);

                // 3. Fetch Real Weekly Stats
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

                    // Transform for Chart
                    // Order: starting from 6 days ago to today? Or just fixed Mon-Sun? 
                    // Chart showed Mon-Sat. Let's show fixed Mon-Sat or dynamic.
                    // For simplicity, fixed hierarchy or just the days we have.
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

    // Custom Theme Classes derived from Tailwind config
    const cardClass = "bg-white border-primary/20 shadow-sm";
    const headerClass = "text-secondary";

    return (
        <div className="space-y-8 min-h-screen bg-gray-50/50 p-4 rounded-xl">
            {/* Header / Banner */}
            <div className="bg-primary text-secondary p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/30 p-2 rounded-full">
                        <Stethoscope className="h-8 w-8 text-secondary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Dr. {doctorName || user?.email?.split('@')[0]} - Panel Clínico</h1>
                        <p className="text-secondary/80">Bienvenido de nuevo</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                        <p className="text-lg font-medium">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
                        <p className="text-sm text-secondary/80">{format(new Date(), "hh:mm a")}</p>
                    </div>
                    <Button
                        onClick={() => setIsRentalDialogOpen(true)}
                        className="bg-secondary text-primary hover:bg-secondary/90 font-medium shadow-sm transition-all hover:scale-105"
                    >
                        <Building2 className="mr-2 h-4 w-4" />
                        Alquilar Espacio
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Column: Agenda (4 cols) */}
                <div className="md:col-span-4 space-y-6">
                    <Card className={`${cardClass} h-full`}>
                        <CardHeader>
                            <CardTitle className={`${headerClass} text-xl`}>Próximas Citas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {upcomingAppointments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No hay citas programadas.</p>
                                    <Button variant="link" className="mt-2 text-primary">Ver agenda completa</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingAppointments.map((apt, index) => (
                                        <div key={apt.id} className="flex items-start gap-4 p-3 bg-white rounded-lg shadow-sm border border-primary/10">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-lg text-primary">{format(new Date(apt.start_time), 'd')}</span>
                                                <span className="text-xs text-muted-foreground uppercase">{format(new Date(apt.start_time), 'MMM', { locale: es })}</span>
                                            </div>
                                            <div>
                                                {/* Display Patient Name using Isolated Component */}
                                                <p className="font-semibold text-gray-800">
                                                    <PatientNameDisplay patientId={apt.patient_id} />
                                                </p>
                                                <p className="text-sm text-muted-foreground capitalize">{apt.notes || 'Consulta General'}</p>
                                            </div>
                                            <div className="ml-auto text-right flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-primary">{format(new Date(apt.start_time), 'HH:mm')}</p>
                                                    {apt.is_virtual && <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">Virtual</span>}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {apt.is_virtual ? (
                                                        (() => {
                                                            const now = new Date();
                                                            const start = new Date(apt.start_time);
                                                            const timeDiff = start.getTime() - now.getTime();
                                                            // Logic: Enable 1 hour before.
                                                            const isTooEarly = timeDiff > 60 * 60 * 1000;

                                                            return (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        disabled={isTooEarly}
                                                                        className={`h-7 text-xs border-blue-200 text-blue-600 ${isTooEarly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                                                                        onClick={() => !isTooEarly && window.open(`https://meet.jit.si/CorpoOriente-${apt.id}`, '_blank')}
                                                                    >
                                                                        {isTooEarly ? (
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2" />
                                                                        ) : (
                                                                            <span className="relative flex h-2 w-2 mr-2">
                                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                                            </span>
                                                                        )}
                                                                        Unirse
                                                                    </Button>
                                                                    {isTooEarly && (
                                                                        <span className="text-[10px] text-orange-500 flex items-center bg-orange-50 px-1 rounded">
                                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                                            Habilitado 1h antes
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        /* In-Person Logic */
                                                        (apt.rental_id || (apt.room_rentals && apt.room_rentals.length > 0)) ? (
                                                            <Link to={`/medical-record?id=${apt.patient_id}&appointment_id=${apt.id}&consultation=true`}>
                                                                <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 text-white">
                                                                    Iniciar Cita
                                                                    <ArrowRight className="ml-1 h-3 w-3" />
                                                                </Button>
                                                            </Link>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                                                                onClick={() => setSelectedAppointmentForRental({
                                                                    id: apt.id,
                                                                    patient_name: apt.patient_profiles?.profiles?.full_name || 'Paciente',
                                                                    start_time: apt.start_time,
                                                                    end_time: apt.end_time
                                                                })}
                                                            >
                                                                <Building2 className="mr-1 h-3 w-3" />
                                                                Alquilar Espacio (Requerido)
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        {/* "Next Therapies" Mockup */}
                        <div className="p-6 pt-0 mt-4">
                            <h3 className={`${headerClass} font-semibold mb-3 flex items-center gap-2`}>
                                <ClipboardCheck className="h-4 w-4" /> Próximas Terapias
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-gray-600 bg-primary/5 p-2 rounded border border-primary/10">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                    <span>20 de Mayo - Terapia Grupal</span>
                                    <PenTool className="h-3 w-3 ml-auto opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* Phone Book Section */}
                        <div className="px-6 pb-6 pt-2">
                            <DoctorActivePatients
                                onSelectPatient={(id) => {
                                    setSelectedPatientId(id);
                                    setIsPatientSidebarOpen(true);
                                }}
                            />
                        </div>
                    </Card>
                </div>

                {/* Center Column: Stats & Action (4 cols) */}
                <div className="md:col-span-4 space-y-6">
                    <Card className={`${cardClass} overflow-hidden`}>
                        <CardHeader>
                            <CardTitle className={`${headerClass} text-xl flex justify-between items-center`}>
                                <span>Rendimiento Semanal</span>
                                <span className="text-xs font-normal text-muted-foreground bg-secondary/5 px-2 py-1 rounded">Últimos 7 días</span>
                            </CardTitle>
                            <CardDescription>Tendencia de pacientes atendidos</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="h-[200px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        { name: 'Lun', consultas: 4, terapias: 2 },
                                        { name: 'Mar', consultas: 3, terapias: 4 },
                                        { name: 'Mié', consultas: 5, terapias: 6 },
                                        { name: 'Jue', consultas: 7, terapias: 3 },
                                        { name: 'Vie', consultas: 6, terapias: 5 },
                                        { name: 'Sáb', consultas: 4, terapias: 2 },
                                    ]}>
                                        <defs>
                                            <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#66C4D0" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#66C4D0" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorTerapias" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#485675" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#485675" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ color: '#6b7280' }}
                                        />
                                        <Area type="monotone" dataKey="consultas" stroke="#66C4D0" fillOpacity={1} fill="url(#colorConsultas)" />
                                        <Area type="monotone" dataKey="terapias" stroke="#485675" fillOpacity={1} fill="url(#colorTerapias)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-6 pt-2">
                                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                    <div className="text-2xl font-bold text-blue-700">{totalConsultations}</div>
                                    <div className="text-xs text-blue-600 font-medium">Consultas (7 días)</div>
                                </div>
                                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                                    <div className="text-2xl font-bold text-emerald-700">{completionRate}%</div>
                                    <div className="text-xs text-emerald-600 font-medium">Completadas</div>
                                </div>
                            </div>

                            <div className="p-6 pt-0">
                                <Button
                                    className="w-full bg-secondary hover:bg-secondary/90 text-primary h-10 shadow-sm transition-all"
                                    onClick={() => document.getElementById('financial-management')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    <FolderOpen className="mr-2 h-4 w-4" />
                                    Reportes Detallados
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Tasks & Messages (4 cols) */}
                <div className="md:col-span-4 flex flex-col gap-6 h-full">
                    <DoctorTasks className="max-h-[350px]" />

                    <DoctorRentals className="flex-1 min-h-[300px]" />

                    <Card className={`${cardClass} shrink-0`}>
                        <CardHeader>
                            <CardTitle className={`${headerClass} text-xl flex items-center gap-2`}>
                                <MessageSquare className="h-4 w-4" /> Mensajes Equipo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="bg-primary/20 p-1.5 rounded-full">
                                        <Users className="h-3 w-3 text-secondary" />
                                    </div>
                                    <span className="font-semibold text-sm text-secondary">Recepción</span>
                                    <span className="text-[10px] text-muted-foreground ml-auto">09:30 AM</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Dr. recuerde que el consultorio 3 está reservado para su sesión de terapia grupal a las 4:00 PM.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div >

            {/* Financial Management Section */}
            <div id="financial-management" className="pt-8">
                <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center gap-2">
                    <FolderOpen className="h-6 w-6" />
                    Gestión Financiera
                </h2>
                <div className="space-y-6">
                    <DoctorPayments />
                </div>
            </div>
            {/* Appointment Rental Dialog */}
            < Dialog open={!!selectedAppointmentForRental} onOpenChange={(open) => !open && setSelectedAppointmentForRental(null)}>
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
            </Dialog >

            {/* Patient Details Sidebar */}
            < PatientDetailsSidebar
                open={isPatientSidebarOpen}
                onOpenChange={setIsPatientSidebarOpen}
                patientId={selectedPatientId}
            />

        </div >
    );
};

export default DoctorDashboard;
