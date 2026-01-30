import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, CalendarDays, Users, Building2, Heart, BookOpen, Coffee, Sun, ArrowRight, Smile, X, Activity, Clock, Phone, Stethoscope, Video, MapPin, Mail } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Link, useNavigate } from 'react-router-dom';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAppointments } from '@/hooks/useAppointments';
import { PatientPayments } from './PatientPayments';

const wellnessTips = [
    {
        icon: <Sun className="h-5 w-5 text-yellow-300" />,
        title: "Tip de Bienestar",
        quote: "La salud mental no es un destino, es un proceso. Tómate un momento cada día para respirar.",
        color: "bg-indigo-600"
    },
    {
        icon: <Coffee className="h-5 w-5 text-orange-300" />,
        title: "Pausa Activa",
        quote: "Regálate 5 minutos de descanso por cada hora de trabajo. Tu cuerpo y mente te lo agradecerán.",
        color: "bg-emerald-600"
    },
    {
        icon: <Heart className="h-5 w-5 text-pink-300" />,
        title: "Autocuidado",
        quote: "Beber suficiente agua es el acto de amor propio más simple y efectivo. ¡Hidrátate!",
        color: "bg-blue-600"
    }
];

const PatientDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
    const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
    const [upcomingRentals, setUpcomingRentals] = useState<any[]>([]);
    const [patientName, setPatientName] = useState<string>('');
    const { cancelAppointment, loading: cancelLoading } = useAppointments();
    const [api, setApi] = useState<CarouselApi>();

    useEffect(() => {
        if (!api) {
            return;
        }

        const intervalId = setInterval(() => {
            api.scrollNext();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [api]);

    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            // 1. Fetch profile name for greeting
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
            if (profile?.full_name) setPatientName(profile.full_name);

            // 2. Get patient profile ID
            const { data: patientProfile } = await supabase
                .from('patient_profiles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!patientProfile) {
                console.log('No patient profile found for user:', user.id);
                setUpcomingAppointments([]);
                return;
            }

            // 3. Fetch active appointments (ONLY CONFIRMED/PAID)
            const { data: appointmentsRaw, error: fetchError } = await supabase
                .from('appointments')
                .select(`
                    *,
                    assignedRoom:room_id(name)
                `)
                .eq('patient_id', patientProfile.id)
                .eq('status', 'confirmed') // Strict filter: only paid/confirmed
                .order('start_time', { ascending: true })
                .limit(5);

            if (fetchError) throw fetchError;

            if (appointmentsRaw && appointmentsRaw.length > 0) {
                // Fetch doctor names separately to avoid join errors
                const doctorIds = [...new Set(appointmentsRaw.map(a => a.doctor_id))];
                const { data: docProfiles } = await supabase
                    .from('doctor_profiles')
                    .select('id, user_id')
                    .in('id', doctorIds);

                const doctorUserIds = docProfiles?.map(d => d.user_id) || [];
                const { data: drProfiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .in('user_id', doctorUserIds);

                const drMap = new Map(drProfiles?.map(p => [p.user_id, p.full_name]));
                const docUserMap = new Map(docProfiles?.map(d => [d.id, d.user_id]));

                const enriched = appointmentsRaw.map(apt => {
                    const rawApt = apt as any;
                    const roomData = [rawApt.assignedRoom, rawApt.rooms, rawApt.room].find(s => s && typeof s === 'object');
                    const roomName = Array.isArray(roomData)
                        ? (roomData[0]?.name || null)
                        : (roomData?.name || null);

                    return {
                        ...apt,
                        doctor_profiles: {
                            profiles: {
                                full_name: drMap.get(docUserMap.get(apt.doctor_id) || '') || 'Doctor'
                            }
                        },
                        roomName
                    };
                });

                const now = new Date();
                const futureConfirmed = enriched.filter(a => new Date(a.start_time).getTime() > now.getTime() - (30 * 60 * 1000));
                setUpcomingAppointments(futureConfirmed);
            } else {
                setUpcomingAppointments([]);
            }

            // 4. Fetch Upcoming Room Rentals
            const nowIso = new Date().toISOString();
            const { data: rentalsData, error: rentalsError } = await supabase
                .from('room_rentals' as any)
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'confirmed')
                .gte('start_time', nowIso)
                .order('start_time', { ascending: true })
                .limit(3);

            if (!rentalsError && rentalsData && rentalsData.length > 0) {
                const roomIds = [...new Set(rentalsData.map((r: any) => r.room_id))];
                const { data: rooms } = await supabase
                    .from('rooms')
                    .select('id, name')
                    .in('id', roomIds);

                const roomMap = new Map((rooms || []).map(r => [r.id, r.name]));
                const enrichedRentals = rentalsData.map((rental: any) => ({
                    ...rental,
                    roomName: roomMap.get(rental.room_id) || 'Salón de Eventos'
                }));
                setUpcomingRentals(enrichedRentals);
            } else {
                setUpcomingRentals([]);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    useEffect(() => { fetchDashboardData(); }, [user]);

    const handleCancel = async (appointmentId: string, startTime: string) => {
        const now = new Date();
        const start = new Date(startTime);
        const hoursDifference = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursDifference < 24) {
            toast({ title: 'Política de Cancelación', description: 'Requerimos 24h de antelación.', variant: "destructive" });
            return;
        }
        await cancelAppointment(appointmentId, 'Cancelado por el paciente');
        fetchDashboardData();
    };

    return (
        <div className="space-y-6 min-h-screen bg-slate-50/50 p-4 lg:p-8 animate-in fade-in duration-500">

            {/* 1. Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                        Hola, <span className="text-teal-600">{patientName.split(' ')[0] || 'Paciente'}</span> 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        ¿Cómo te sientes hoy? Aquí tienes un resumen de tu actividad.
                    </p>
                </div>
                <Link to="/appointments">
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 rounded-full px-6 transition-transform hover:scale-105">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Cita
                    </Button>
                </Link>
            </div>

            {/* 2. Dashboard Grid: Hero & Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Main Hero (Next Appointment) */}
                <div className="lg:col-span-2">
                    {upcomingAppointments.length > 0 ? (
                        <Card className="h-full border-none shadow-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white overflow-hidden relative min-h-[300px] flex flex-col justify-center">
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-12" />
                            <CardContent className="p-8 relative z-10">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="space-y-6 flex-1 text-left">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-50 text-xs font-semibold uppercase tracking-wider border border-white/20">
                                            <Clock className="h-3 w-3" />
                                            Próxima Cita
                                        </div>
                                        <div>
                                            {/* Main Title: Room Name */}
                                            <h2 className="text-3xl md:text-5xl font-bold mb-2 tracking-tight leading-none">
                                                {upcomingAppointments[0].is_virtual ? 'Google Meet' : (upcomingAppointments[0].roomName || 'Consultorio')}
                                            </h2>
                                            {/* Subtitle: Date & Time */}
                                            <p className="text-teal-50 text-xl md:text-2xl font-light opacity-90 capitalize">
                                                {format(new Date(upcomingAppointments[0].start_time), "EEEE d 'de' MMMM — h:mm a", { locale: es })}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium bg-black/10 p-4 rounded-xl w-fit backdrop-blur-sm border border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/20 rounded-full">
                                                    <Stethoscope className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-white/70 uppercase tracking-wider">Especialista</span>
                                                    <span className="font-bold whitespace-nowrap">Dr/a. {upcomingAppointments[0].doctor_profiles?.profiles?.full_name || 'Asignado'}</span>
                                                </div>
                                            </div>
                                            <div className="hidden sm:block w-px h-8 bg-white/20" />
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/20 rounded-full">
                                                    <CalendarDays className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="flex flex-col">
                                                    {/* Footer Pill: Date (since Room is now Title) */}
                                                    <span className="text-xs text-white/70 uppercase tracking-wider">Fecha</span>
                                                    <span className="font-bold whitespace-nowrap capitalize">{format(new Date(upcomingAppointments[0].start_time), "MMM d, yyyy", { locale: es })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                                        {upcomingAppointments[0].is_virtual && (() => {
                                            const startTime = new Date(upcomingAppointments[0].start_time).getTime();
                                            const now = new Date().getTime();
                                            const fifteenMinutes = 15 * 60 * 1000;
                                            const isTooEarly = now < (startTime - fifteenMinutes);

                                            if (isTooEarly) {
                                                return (
                                                    <div className="relative group/tooltip w-full">
                                                        <Button
                                                            className="w-full bg-white/20 text-white hover:bg-white/30 border-none font-bold shadow-lg h-12 cursor-not-allowed"
                                                            disabled
                                                        >
                                                            <Video className="mr-2 h-5 w-5 opacity-50" />
                                                            Unirse
                                                        </Button>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                            Habilitado 15 min antes
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <Button
                                                    className="w-full bg-white text-teal-700 hover:bg-teal-50 border-none font-bold shadow-lg h-12"
                                                    onClick={() => window.open(`https://meet.jit.si/CorpoOriente-${upcomingAppointments[0].id}`, '_blank')}
                                                >
                                                    <Video className="mr-2 h-5 w-5" />
                                                    Unirse
                                                </Button>
                                            );
                                        })()}
                                        <Button
                                            variant="outline"
                                            className="w-full border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent h-12"
                                            onClick={() => handleCancel(upcomingAppointments[0].id, upcomingAppointments[0].start_time)}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none min-h-[300px] h-full flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                <CalendarDays className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">¡Todo despejado!</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-6">
                                No tienes citas próximas. Es un buen momento para agendar tu control preventivo.
                            </p>
                            <Link to="/appointments">
                                <Button className="bg-teal-600 hover:bg-teal-700">
                                    Ver Agenda Disponible
                                </Button>
                            </Link>
                        </Card>
                    )}
                </div>

                {/* Right Column: Sidebar (2nd Appointment & Rentals) */}
                <div className="flex flex-col gap-6">

                    {/* 2nd Appointment (Compact) or empty placeholder */}
                    {upcomingAppointments.length > 1 ? (
                        <Card className="border-none shadow-md bg-white overflow-hidden hover:shadow-lg transition-all border-l-4 border-l-teal-400">
                            <CardHeader className="pb-3 pt-5 border-none">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-teal-100 rounded-md text-teal-700">
                                            <CalendarDays className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Siguiente Cita</span>
                                    </div>
                                    <div className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-bold border border-teal-200">
                                        CONFIRMADO
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-5">
                                <h4 className="font-bold text-slate-800 text-lg mb-1 leading-tight">
                                    {upcomingAppointments[1].is_virtual ? 'Google Meet' : (upcomingAppointments[1].roomName || 'Consultorio')}
                                </h4>
                                <div className="space-y-2 mt-3 text-left">
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <CalendarDays className="h-4 w-4 text-teal-400 flex-shrink-0" />
                                        <span className="capitalize">{format(new Date(upcomingAppointments[1].start_time), "EEEE d MMMM", { locale: es })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Clock className="h-4 w-4 text-teal-400 flex-shrink-0" />
                                        <span className="capitalize">{format(new Date(upcomingAppointments[1].start_time), 'h:mm a')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">
                                        <Stethoscope className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
                                        <span className="truncate">Dr/a. {upcomingAppointments[1].doctor_profiles?.profiles?.full_name || 'Asignado'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    {/* Next Rental (Compact) */}
                    {upcomingRentals.length > 0 ? (
                        <Card className="border-none shadow-md bg-white overflow-hidden hover:shadow-lg transition-all border-l-4 border-l-amber-500 h-fit">
                            <CardHeader className="pb-3 pt-5 border-none">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-amber-100 rounded-md text-amber-700">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Reserva Espacio</span>
                                    </div>
                                    <div className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-200">
                                        CONFIRMADO
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-5">
                                <h4 className="font-bold text-slate-800 text-lg mb-1 leading-tight">
                                    {upcomingRentals[0].roomName}
                                </h4>
                                <div className="space-y-2 mt-3 text-left">
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <CalendarDays className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                        <span className="capitalize">{format(new Date(upcomingRentals[0].start_time), "EEEE d MMMM", { locale: es })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                        <span>
                                            {format(new Date(upcomingRentals[0].start_time), 'h:mm a')} - {format(new Date(upcomingRentals[0].end_time), 'h:mm a')}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    {/* Show alternative content if sidebar is empty */}
                    {!upcomingRentals.length && upcomingAppointments.length <= 1 && (
                        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none flex flex-col items-center justify-center p-6 text-center h-full min-h-[150px]">
                            <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                                <Smile className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="text-xs font-medium text-slate-500">
                                Sin tareas pendientes hoy. ¡Disfruta tu día!
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            {/* 3. Quick Actions Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/appointments" className="block group">
                    <Card className="h-full border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-1 group-hover:ring-teal-100">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                                <CalendarDays className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Mis Citas</h3>
                                <p className="text-xs text-slate-500">Historial y Futuras</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <div className="block group cursor-pointer" onClick={() => document.getElementById('payment-history')?.scrollIntoView({ behavior: 'smooth' })}>
                    <Card className="h-full border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-white group-hover:ring-1 group-hover:ring-emerald-100">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Mis Facturas</h3>
                                <p className="text-xs text-slate-500">Pagos y Recibos</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Link to="/settings" className="block group">
                    <Card className="h-full border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-white cursor-pointer group-hover:ring-1 group-hover:ring-purple-100">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Mi Perfil</h3>
                                <p className="text-xs text-slate-500">Datos Personales</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Dialog open={isRentalDialogOpen} onOpenChange={setIsRentalDialogOpen}>
                    <DialogTrigger asChild>
                        <Card className="h-full border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-white cursor-pointer group hover:ring-1 hover:ring-amber-100">
                            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Espacios</h3>
                                    <p className="text-xs text-slate-500">Reservar Salones</p>
                                </div>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Reserva de Espacios</DialogTitle>
                        </DialogHeader>
                        <RoomRentalBooking />
                    </DialogContent>
                </Dialog>
            </div>

            {/* 4. Payment History */}
            <div id="payment-history" className="grid grid-cols-1 gap-6">
                <PatientPayments />
            </div>


            {/* 5. Wellness & Help */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Wellness Carousel */}
                <Card className="border-none shadow-sm overflow-hidden relative p-0 bg-transparent">
                    <Carousel className="w-full h-full" opts={{ loop: true }} setApi={setApi}>
                        <CarouselContent>
                            {wellnessTips.map((tip, index) => (
                                <CarouselItem key={index}>
                                    <div className={`${tip.color} text-white p-6 h-full min-h-[220px] flex flex-col justify-center relative overflow-hidden rounded-xl`}>
                                        <div className="absolute right-0 bottom-0 opacity-10">
                                            <Heart className="h-32 w-32 -mb-8 -mr-8" />
                                        </div>

                                        <div className="relative z-10 text-center">
                                            <div className="flex items-center justify-center gap-2 mb-4 font-bold text-lg">
                                                {tip.icon}
                                                {tip.title}
                                            </div>
                                            <blockquote className="text-xl font-medium italic mb-2 leading-relaxed opacity-95">
                                                "{tip.quote}"
                                            </blockquote>
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="hidden md:block">
                            <CarouselPrevious className="left-2 bg-white/20 border-none hover:bg-white/40 text-white" />
                            <CarouselNext className="right-2 bg-white/20 border-none hover:bg-white/40 text-white" />
                        </div>
                    </Carousel>
                </Card>

                {/* Contact & Help */}
                <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50 relative">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-800 text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-teal-600" />
                            Contacto y Ubicación
                        </CardTitle>
                        <CardDescription>Estamos aquí para escucharte.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-4 text-sm text-slate-600">
                            <div className="bg-teal-100 p-2 rounded-full flex-shrink-0 mt-1">
                                <MapPin className="h-4 w-4 text-teal-700" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">Dirección Principal</p>
                                <p>Av. 3E # 4-56, Barrio La Ceiba</p>
                                <p>Cúcuta, Norte de Santander</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="bg-indigo-100 p-2 rounded-full flex-shrink-0">
                                <Mail className="h-4 w-4 text-indigo-700" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">Correo Electrónico</p>
                                <p>contacto@corpooriente.com</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                                <Phone className="h-4 w-4 text-green-700" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">Línea de Atención</p>
                                <p>+57 300 123 4567</p>
                            </div>
                        </div>

                        <Button
                            className="w-full bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all active:scale-95"
                            onClick={() => window.location.href = 'tel:+573001234567'}
                        >
                            <Phone className="mr-2 h-4 w-4" />
                            Llamar a Soporte
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PatientDashboard;
