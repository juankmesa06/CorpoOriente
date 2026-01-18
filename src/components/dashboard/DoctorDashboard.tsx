import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Stethoscope, CalendarDays, Users, Building2, AlertTriangle, MessageSquare, ClipboardCheck, ArrowRight, FolderOpen, PenTool, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { DoctorPayments } from './DoctorPayments';
import { DoctorPatientHistory } from './DoctorPatientHistory';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DoctorDashboardProps {
    isProfileIncomplete: boolean;
}

const DoctorDashboard = ({ isProfileIncomplete }: DoctorDashboardProps) => {
    const { user } = useAuth();
    const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
    const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
    const [stats, setStats] = useState([
        { name: 'Consultas', value: 40, color: '#66C4D0' }, // Primary (Aquamarine)
        { name: 'Terapias', value: 20, color: '#8ADDD8' }, // Lighter Primary
        { name: 'Valoraciones', value: 30, color: '#485675' }, // Secondary (Dark Blue)
        { name: 'Urgencias', value: 10, color: '#f59e0b' }, // Amber/Orange
    ]);

    useEffect(() => {
        const fetchTodayAppointments = async () => {
            if (!user) return;
            const today = new Date().toISOString().split('T')[0];
            const { data: doctorProfile } = await supabase.from('doctor_profiles').select('id').eq('user_id', user.id).single();

            if (doctorProfile) {
                const { data } = await supabase
                    .from('appointments')
                    .select('*, patient_profiles(profiles(full_name))')
                    .eq('doctor_id', doctorProfile.id)
                    .gte('start_time', `${today}T00:00:00`)
                    .lte('start_time', `${today}T23:59:59`)
                    .order('start_time', { ascending: true });

                setTodayAppointments(data || []);
            }
        };
        fetchTodayAppointments();
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
                        <h1 className="text-2xl font-bold">Dr. {user?.email?.split('@')[0]} - Panel Clínico</h1>
                        <p className="text-secondary/80">Bienvenido de nuevo</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-medium">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
                    <p className="text-sm text-secondary/80">{format(new Date(), "hh:mm a")}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Column: Agenda (4 cols) */}
                <div className="md:col-span-4 space-y-6">
                    <Card className={`${cardClass} h-full`}>
                        <CardHeader>
                            <CardTitle className={`${headerClass} text-xl`}>Citas de Hoy</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {todayAppointments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No hay citas para hoy.</p>
                                    <Button variant="link" className="mt-2 text-primary">Ver agenda completa</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {todayAppointments.map((apt, index) => (
                                        <div key={apt.id} className="flex items-start gap-4 p-3 bg-white rounded-lg shadow-sm border border-primary/10">
                                            <span className="font-bold text-lg text-primary w-6">{index + 1}</span>
                                            <div>
                                                <p className="font-semibold text-gray-800">{apt.patient_profiles?.profiles?.full_name || 'Paciente'}</p>
                                                <p className="text-sm text-muted-foreground capitalize">{apt.notes || 'Consulta General'}</p>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <p className="font-medium text-primary">{format(new Date(apt.start_time), 'HH:mm')}</p>
                                                {apt.is_virtual && <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">Virtual</span>}
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
                    </Card>
                </div>

                {/* Center Column: Stats & Action (4 cols) */}
                <div className="md:col-span-4 space-y-6">
                    <Card className={`${cardClass} flex flex-col items-center justify-center text-center p-6 space-y-6`}>
                        <CardHeader className="p-0">
                            <CardTitle className={`${headerClass} text-xl`}>Estadísticas Semanales</CardTitle>
                            <CardDescription>Resumen de actividad reciente</CardDescription>
                        </CardHeader>
                        <div className="h-[200px] w-full flex items-center justify-center relative">
                            {/* Simple Pie Chart */}
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-secondary">100%</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-left w-full max-w-[250px]">
                            {stats.map((s) => (
                                <div key={s.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                    <span className="text-gray-600">{s.name}</span>
                                </div>
                            ))}
                        </div>

                        <Button
                            className="w-full bg-primary hover:bg-primary/90 text-secondary h-12 text-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                            onClick={() => document.getElementById('patient-history')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            <FolderOpen className="mr-2 h-5 w-5" />
                            Acceso a Historias Clínicas
                        </Button>
                    </Card>
                </div>

                {/* Right Column: Tasks & Messages (4 cols) */}
                <div className="md:col-span-4 space-y-6">
                    <Card className={cardClass}>
                        <CardHeader>
                            <CardTitle className={`${headerClass} text-xl`}>Tareas Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { title: 'Revisar Resultados', patient: 'Laura Torres', urgent: true },
                                { title: 'Firmar Historias', patient: 'Pendientes: 3', urgent: false },
                                { title: 'Plan de Terapia', patient: 'Roberto Silva', urgent: false }
                            ].map((task, i) => (
                                <div key={i} className="flex items-start gap-3 p-2 hover:bg-primary/5 rounded transition-colors cursor-pointer group">
                                    <div className={`mt-1 h-2 w-2 rounded-full ${task.urgent ? 'bg-red-500' : 'bg-secondary'}`} />
                                    <div>
                                        <p className="font-medium text-gray-800 group-hover:text-primary">{task.title}</p>
                                        <p className={`text-xs ${task.urgent ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                            {task.patient}
                                            {task.urgent && ' (Prioritario)'}
                                        </p>
                                    </div>
                                    <PenTool className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-50 text-secondary" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className={cardClass}>
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
            </div>

            {/* Legacy Components Section (Hidden mostly, but accessible via scroll) */}
            <div id="patient-history" className="pt-8">
                <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center gap-2">
                    <FolderOpen className="h-6 w-6" />
                    Gestión Completa
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <DoctorPatientHistory />

                    <div className="space-y-6">
                        <DoctorPayments />

                        {/* Room Rental Card */}
                        <Card className="border-primary/20 bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-secondary">
                                    <Building2 className="h-5 w-5" />
                                    Alquiler de Espacios
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Dialog open={isRentalDialogOpen} onOpenChange={setIsRentalDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full bg-primary/5 text-secondary hover:bg-primary/20 border border-primary/20" variant="outline">
                                            Ver Espacios Disponibles
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Reserva tu Espacio</DialogTitle>
                                        </DialogHeader>
                                        <RoomRentalBooking />
                                    </DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
