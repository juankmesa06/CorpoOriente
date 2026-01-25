import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, CalendarDays, Users, Building2, Heart, BookOpen, Coffee, Sun, ArrowRight, Smile, X, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAppointments } from '@/hooks/useAppointments';

const PatientDashboard = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
    const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
    const [patientName, setPatientName] = useState<string>('');
    const [patientId, setPatientId] = useState<string>('');
    const { cancelAppointment, loading: cancelLoading } = useAppointments();
    const [waterGlasses, setWaterGlasses] = useState(2); // Default 2 glasses filled

    const [healthData, setHealthData] = useState<any>({
        blood_type: null,
        allergies: [],
        current_medications: [],
        phone: '',
        date_of_birth: '',
        gender: '',
        insurance_provider: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
    });

    // Move fetch logic to function to be reusable
    const fetchDashboardData = async () => {
        if (!user) return;

        // 1. Fetch Name and Phone
        const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileData?.full_name) {
            setPatientName(profileData.full_name);
        }

        // 2. Get Patient Profile
        const { data: patientProfile } = await supabase
            .from('patient_profiles')
            .select('id, blood_type, allergies, date_of_birth, gender, insurance_provider, emergency_contact_name, emergency_contact_phone')
            .eq('user_id', user.id)
            .maybeSingle();

        if (patientProfile) {
            setPatientId(patientProfile.id);
            console.log('Patient Profile found:', patientProfile);

            // 3. Search appointments (LIMIT 3)
            const { data: appointments, error: aptError } = await supabase
                .from('appointments')
                .select('*, rooms(name)')
                .eq('patient_id', patientProfile.id)
                .in('status', ['confirmed', 'scheduled', 'completed'])
                .order('start_time', { ascending: false })
                .limit(3); // LIMIT TO 3

            if (aptError) {
                console.error('Error fetching appointments:', aptError);
            }

            setUpcomingAppointments(appointments || []);

            // 4. Search medical records
            const { data: medicalRecord } = await supabase
                .from('medical_records')
                .select('current_medications')
                .eq('patient_id', patientProfile.id)
                .maybeSingle();

            setHealthData({
                blood_type: patientProfile.blood_type,
                allergies: patientProfile.allergies || [],
                current_medications: medicalRecord?.current_medications || [],
                phone: profileData?.phone || '',
                date_of_birth: patientProfile.date_of_birth || '',
                gender: patientProfile.gender || '',
                insurance_provider: patientProfile.insurance_provider || '',
                emergency_contact_name: patientProfile.emergency_contact_name || '',
                emergency_contact_phone: patientProfile.emergency_contact_phone || ''
            });
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    // Handle Cancel with 24h Policy
    const handleCancel = async (appointmentId: string, startTime: string) => {
        const now = new Date();
        const start = new Date(startTime);
        const hoursDifference = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursDifference < 24) {
            toast({
                title: 'Política de Cancelación',
                description: 'Solo se pueden cancelar citas con al menos 24 horas de anticipación.',
                variant: "destructive",
                duration: 5000,
            });
            return;
        }

        const success = await cancelAppointment(appointmentId, 'Cancelado por el paciente desde Dashboard');
        if (success) {
            fetchDashboardData();
        }
    };

    const wellnessArticles = [
        {
            title: "Mindfulness para la salud: Lo que necesitas saber",
            category: "Bienestar Mental",
            color: "bg-blue-100 text-blue-700",
            readTime: "5 min",
            icon: <Sun className="h-4 w-4" />,
            url: "https://medlineplus.gov/spanish/mindfulness.html"
        },
        {
            title: "El sueño y su salud: Por qué es importante",
            category: "Salud Física",
            color: "bg-indigo-100 text-indigo-700",
            readTime: "3 min",
            icon: <Coffee className="h-4 w-4" />,
            url: "https://medlineplus.gov/spanish/healthysleep.html"
        },
        {
            title: "Estrés en el trabajo: Consejos para manejarlo",
            category: "Vida Diaria",
            color: "bg-green-100 text-green-700",
            readTime: "7 min",
            icon: <Heart className="h-4 w-4" />,
            url: "https://www.mayoclinic.org/es/healthy-lifestyle/stress-management/in-depth/stress-relief/art-20044456"
        }
    ];

    return (
        <div className="space-y-8 min-h-screen bg-gray-50/50 p-4 md:p-8 animate-in fade-in duration-700">
            {/* Header / Personalized Welcome */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-blue-600 shadow-xl">
                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full blur-2xl -ml-20 -mb-20" />

                <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="max-w-2xl text-white">
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                            Hola, {patientName || user?.email?.split('@')[0]}
                        </h1>
                        <p className="text-blue-100 text-lg font-medium leading-relaxed opacity-90">
                            "Tómate un momento para respirar hoy. Tu bienestar es lo primero."
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/appointments">
                            <Button className="h-14 px-8 rounded-full bg-white text-primary hover:bg-blue-50 font-bold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 border-0">
                                <PlusCircle className="h-5 w-5 mr-2" />
                                Agendar Cita
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Upcoming Appointments Card */}
            <Card className="border-none shadow-lg bg-white overflow-hidden relative group mb-8 hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-blue-400 group-hover:w-2 transition-all duration-300" />
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100/50">
                    <CardTitle className="flex items-center gap-3 text-xl text-slate-800">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <CalendarDays className="h-6 w-6" />
                        </div>
                        <span className="font-bold">Mis Próximas Citas</span>
                        {/* Debug Info: Show Patient ID if available to confirm loading */}
                        {patientId && <span className="text-xs text-muted-foreground ml-auto font-mono opacity-50 font-normal">ID: {patientId.slice(0, 8)}</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 p-0">
                    {upcomingAppointments.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {upcomingAppointments.map((apt: any, index: number) => (
                                <div key={apt.id} className="group/item flex flex-col md:flex-row md:items-center gap-6 p-6 hover:bg-slate-50/80 transition-all duration-300">
                                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm min-w-[100px] group-hover/item:border-primary/20 group-hover/item:shadow-md transition-all">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(new Date(apt.start_time), 'MMM', { locale: es })}</p>
                                        <p className="text-3xl font-black text-slate-800 my-0.5">{format(new Date(apt.start_time), 'd')}</p>
                                        <p className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full">{format(new Date(apt.start_time), 'EEE', { locale: es })}</p>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <p className="font-bold text-lg text-slate-800">
                                                {format(new Date(apt.start_time), 'HH:mm')} - {format(new Date(apt.end_time), 'HH:mm')}
                                            </p>
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm border
                                            ${apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    apt.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        apt.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                                {apt.status === 'confirmed' ? 'Confirmada' :
                                                    apt.status === 'completed' ? 'Completada' :
                                                        apt.status === 'cancelled' ? 'Cancelada' :
                                                            'Programada'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1.5 text-sm">
                                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                {apt.is_virtual ? <div className="p-1 rounded-md bg-purple-100 text-purple-600"><Users className="h-3.5 w-3.5" /></div> : <div className="p-1 rounded-md bg-slate-100 text-slate-600"><Building2 className="h-3.5 w-3.5" /></div>}
                                                {apt.is_virtual ? 'Consulta Virtual' : (apt.rooms?.name ? `Presencial - ${apt.rooms.name}` : 'Consulta Presencial')}
                                            </div>
                                            {/* Simplified Doctor Name Display */}
                                            {apt.doctor_profiles && (
                                                <div className="flex items-center gap-2 ml-1 text-slate-500">
                                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <p>Con: <span className="font-semibold text-slate-700">Dr/a. {apt.doctor_profiles?.profiles?.full_name || 'Asignado'}</span></p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        {/* Video Call Button with 1h Restriction */}
                                        {apt.is_virtual && (
                                            (() => {
                                                const now = new Date();
                                                const start = new Date(apt.start_time);
                                                const timeDiff = start.getTime() - now.getTime();
                                                // Enable if within 1 hour (3600000ms) before start, or if already started/past (but typically we filter past)
                                                // Let's assume we allow joining even if late, so just check if we are NOT too early.
                                                // Too early means timeDiff > 60 minutes
                                                const isTooEarly = timeDiff > 60 * 60 * 1000;

                                                return (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={isTooEarly}
                                                            className={`rounded-full gap-2 font-medium shadow-sm transition-all
                                                            ${isTooEarly
                                                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                    : 'bg-white hover:bg-blue-50 border-blue-200 text-blue-600'}`}
                                                            onClick={() => !isTooEarly && window.open(`https://meet.jit.si/CorpoOriente-${apt.id}`, '_blank')}
                                                            title={isTooEarly ? "Habilitado 1 hora antes de la cita" : "Unirse a la videollamada"}
                                                        >
                                                            {isTooEarly ? (
                                                                <div className="w-2 h-2 rounded-full bg-slate-400" />
                                                            ) : (
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                                </span>
                                                            )}
                                                            Unirse
                                                        </Button>
                                                        {isTooEarly && (
                                                            <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                                                Disponible 1 hora antes
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        )}

                                        {/* Cancel Button */}
                                        {['scheduled', 'confirmed', 'pending', 'paid'].includes(apt.status) && new Date(apt.start_time) > new Date() && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                onClick={() => handleCancel(apt.id, apt.start_time)}
                                                disabled={cancelLoading}
                                                title="Cancelar Cita"
                                            >
                                                <X className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                <CalendarDays className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-slate-900 font-medium text-lg">Estás al día</p>
                            <p className="text-slate-500 text-sm mb-6">No tienes citas programadas próximamente</p>
                            <Link to="/appointments">
                                <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                                    <PlusCircle className="h-4 w-4" />
                                    Programar Nueva Cita
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Health Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-md bg-white hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xl text-secondary">
                            <Activity className="h-5 w-5 text-red-500" />
                            Tu Salud y Ánimo
                        </CardTitle>
                        <CardDescription>Resumen vital y seguimiento diario</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-2">
                        {/* Compact Vitals Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100/50">
                                <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                                    <Users className="h-4 w-4 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider truncate">Sanguíneo</p>
                                    <p className="font-bold text-secondary">{healthData.blood_type || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100/50">
                                <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                                    <Smile className="h-4 w-4 text-orange-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider truncate">Alergias</p>
                                    <p className="font-bold text-secondary text-sm truncate">
                                        {healthData.allergies?.length > 0 ? healthData.allergies[0] + (healthData.allergies.length > 1 ? '...' : '') : 'Ninguna'}
                                    </p>
                                </div>
                            </div>

                            <div className="col-span-2 flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                                    <BookOpen className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Medicación</p>
                                    <p className="font-medium text-secondary text-sm truncate">
                                        {healthData.current_medications?.length > 0
                                            ? healthData.current_medications.map((m: any) => m.name).join(', ')
                                            : 'Sin medicación activa'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Mood Tracker Section */}
                        <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-secondary flex items-center gap-2">
                                    <Heart className="h-4 w-4 text-rose-500" />
                                    ¿Cómo te sientes hoy?
                                </h4>
                                <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">Registro Diario</span>
                            </div>

                            <div className="flex justify-between items-center bg-gray-50/80 p-3 rounded-2xl">
                                {[
                                    { icon: '😄', label: 'Bien', color: 'hover:bg-green-100 hover:scale-110' },
                                    { icon: '😐', label: 'Neutral', color: 'hover:bg-gray-200 hover:scale-110' },
                                    { icon: '😔', label: 'Mal', color: 'hover:bg-blue-100 hover:scale-110' },
                                    { icon: '😫', label: 'Cansado', color: 'hover:bg-orange-100 hover:scale-110' },
                                    { icon: '😡', label: 'Molesto', color: 'hover:bg-red-100 hover:scale-110' }
                                ].map((mood, i) => (
                                    <button
                                        key={i}
                                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-12 h-12 ${mood.color}`}
                                        title={mood.label}
                                        onClick={(e) => {
                                            const btn = e.currentTarget;
                                            btn.style.transform = 'scale(0.9)';
                                            setTimeout(() => btn.style.transform = '', 150);
                                            toast({
                                                title: "¡Ánimo registrado!",
                                                description: `Te sientes ${mood.label.toLowerCase()} hoy.`,
                                                duration: 3000,
                                                className: "bg-white border-none shadow-lg"
                                            });
                                        }}
                                    >
                                        <span className="text-2xl filter drop-shadow-sm">{mood.icon}</span>
                                    </button>
                                ))}
                            </div>
                        </div>


                        {/* Hydration Section (Visual Filler) */}
                        <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-secondary flex items-center gap-2">
                                    <div className="bg-blue-100 p-1 rounded-md">
                                        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
                                    </div>
                                    Hidratación
                                </h4>
                                <span className="text-xs font-bold text-blue-500">{waterGlasses} / 8 Vasos</span>
                            </div>
                            <div className="flex justify-between px-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((glass) => (
                                    <button
                                        key={glass}
                                        className={`group relative h-10 w-6 rounded-b-lg border-2 border-t-0 border-blue-200 transition-all duration-300 hover:-translate-y-1
                                            ${glass <= waterGlasses ? 'bg-blue-400 border-blue-400 shadow-md shadow-blue-200' : 'bg-blue-50/50'}`}
                                        title={`Registrar ${glass} vaso(s)`}
                                        onClick={() => {
                                            if (glass === waterGlasses) {
                                                // Toggle off if clicking the last filled one
                                                setWaterGlasses(glass - 1);
                                            } else {
                                                setWaterGlasses(glass);
                                                toast({ title: "¡Hidratación registrada!", description: `¡Has bebido ${glass} vasos hoy! Mantente hidratado.`, duration: 2000 });
                                            }
                                        }}
                                    >
                                        <div className={`absolute bottom-0 left-0 w-full bg-blue-300 transition-all duration-500 ${glass <= waterGlasses ? 'h-full opacity-100' : 'h-0 opacity-0 group-hover:h-1/3 group-hover:opacity-50'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Wellness Hub */}
                <div className="space-y-8">
                    {/* Espacios de Relajacion */}
                    <Card className="border-none shadow-md bg-[#1a2b3b] text-white overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
                        <CardHeader className="relative z-10">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Building2 className="h-5 w-5" />
                                    Alquiler de Espacios
                                </CardTitle>
                            </div>
                            <CardDescription className="text-gray-300">
                                ¿Buscas un lugar para tus eventos o talleres?
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <Dialog open={isRentalDialogOpen} onOpenChange={setIsRentalDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm">
                                        Ver Salones Disponibles
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Reserva de Espacios y Consultorios</DialogTitle>
                                    </DialogHeader>
                                    <RoomRentalBooking />
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-white">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-xl text-secondary">
                                    <Coffee className="h-5 w-5 text-emerald-600" />
                                    Wellness Hub
                                </CardTitle>
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">Nuevo</span>
                            </div>
                            <CardDescription>Recursos seleccionados para ti</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                                <div className="flex items-start gap-3">
                                    <Sun className="h-5 w-5 text-orange-500 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-orange-800 text-sm mb-1">Tip del Día</p>
                                        <p className="text-sm text-orange-700/80 italic">
                                            "Beber un vaso de agua antes de cada sesión ayuda a mejorar la concentración."
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-secondary/40 uppercase tracking-widest mb-4">Lecturas Recomendadas</p>
                                <div className="space-y-3">
                                    {wellnessArticles.map((article, i) => (
                                        <a
                                            key={i}
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group cursor-pointer border border-transparent hover:border-gray-100"
                                        >
                                            <div className={`p-2 rounded-lg ${article.color} group-hover:scale-110 transition-transform`}>
                                                {article.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm text-secondary group-hover:text-primary transition-colors line-clamp-1">
                                                    {article.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-secondary/50">{article.category}</span>
                                                    <span className="text-[10px] text-secondary/30">•</span>
                                                    <span className="text-xs text-secondary/50">{article.readTime}</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-secondary/30 group-hover:text-primary -translate-x-1 group-hover:translate-x-0 transition-all" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div >
        </div >
    );
};

export default PatientDashboard;
