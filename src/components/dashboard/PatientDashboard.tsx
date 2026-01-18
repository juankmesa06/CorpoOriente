import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, CalendarDays, Users, Building2, Heart, BookOpen, Coffee, Sun, ArrowRight, Smile } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const PatientDashboard = () => {
    const { user } = useAuth();
    const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
    const [nextAppointment, setNextAppointment] = useState<any>(null);

    // Fetch next upcoming appointment
    useEffect(() => {
        const fetchNextAppointment = async () => {
            if (!user) return;
            const { data: patientProfile } = await supabase.from('patient_profiles').select('id').eq('user_id', user.id).single();

            if (patientProfile) {
                const { data } = await supabase
                    .from('appointments')
                    .select('*, doctor_profiles(profiles(full_name), specialty)')
                    .eq('patient_id', patientProfile.id)
                    .gte('start_time', new Date().toISOString())
                    .in('status', ['confirmed', 'scheduled'])
                    .order('start_time', { ascending: true })
                    .limit(1)
                    .single();

                setNextAppointment(data);
            }
        };
        fetchNextAppointment();
    }, [user]);

    const wellnessArticles = [
        {
            title: "5 Técnicas de Mindfulness para la Ansiedad",
            category: "Bienestar Mental",
            color: "bg-blue-100 text-blue-700",
            readTime: "5 min",
            icon: <Sun className="h-4 w-4" />
        },
        {
            title: "La Importancia del Sueño en la Terapia",
            category: "Salud Física",
            color: "bg-indigo-100 text-indigo-700",
            readTime: "3 min",
            icon: <Coffee className="h-4 w-4" />
        },
        {
            title: "Cómo Gestionar el Estrés Laboral",
            category: "Vida Diaria",
            color: "bg-green-100 text-green-700",
            readTime: "7 min",
            icon: <Heart className="h-4 w-4" />
        }
    ];

    return (
        <div className="space-y-8 min-h-screen bg-gray-50/50 p-4 rounded-xl">
            {/* Header / Personalized Welcome */}
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-8 rounded-2xl border border-primary/10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary tracking-tight">
                            Hola, {user?.email?.split('@')[0]}
                        </h1>
                        <p className="text-lg text-secondary/70 mt-1">
                            "Tómate un momento para respirar hoy. Tu bienestar es lo primero."
                        </p>
                    </div>
                    <div className="bg-white p-3 rounded-full shadow-sm">
                        <Smile className="h-8 w-8 text-primary" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Care & Actions (7 cols) */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Next Appointment Card */}
                    <Card className="border-none shadow-md bg-white overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-secondary">
                                <CalendarDays className="h-5 w-5 text-primary" />
                                Tu Próxima Sesión
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {nextAppointment ? (
                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    <div className="bg-primary/5 p-4 rounded-xl text-center min-w-[100px]">
                                        <p className="text-sm font-semibold text-secondary/60 uppercase">{format(new Date(nextAppointment.start_time), 'MMMM', { locale: es })}</p>
                                        <p className="text-4xl font-bold text-primary">{format(new Date(nextAppointment.start_time), 'd')}</p>
                                        <p className="text-sm font-medium text-secondary">{format(new Date(nextAppointment.start_time), 'EEEE', { locale: es })}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-lg font-semibold text-gray-800">
                                            {nextAppointment.is_virtual ? 'Sesión Virtual' : 'Consulta Presencial'}
                                        </p>
                                        <p className="text-muted-foreground">
                                            Con: <span className="font-medium text-secondary">{nextAppointment.doctor_profiles?.profiles?.full_name || 'Tu Especialista'}</span>
                                        </p>
                                        <p className="text-sm text-primary font-medium bg-primary/10 inline-block px-2 py-1 rounded">
                                            Hora: {format(new Date(nextAppointment.start_time), 'h:mm a')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed text-muted-foreground">
                                    <p>No tienes citas programadas próximamente.</p>
                                    <Link to="/appointments">
                                        <Button variant="link" className="text-primary">Agendar Ahora</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link to="/appointments">
                            <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20 bg-primary/5 h-full">
                                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                    <div className="bg-white p-3 rounded-full shadow-sm">
                                        <PlusCircle className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-secondary">Agendar Cita</h3>
                                    <p className="text-xs text-muted-foreground">Reserva tu espacio con un especialista</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link to="/medical-record">
                            <Card className="hover:shadow-md transition-shadow cursor-pointer border-indigo-100 bg-indigo-50/50 h-full">
                                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                    <div className="bg-white p-3 rounded-full shadow-sm">
                                        <BookOpen className="h-6 w-6 text-indigo-500" />
                                    </div>
                                    <h3 className="font-semibold text-secondary">Mi Historial</h3>
                                    <p className="text-xs text-muted-foreground">Revisa tus notas y evolución</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>

                    {/* Room Rental Promo */}
                    <Card className="border-none bg-gradient-to-r from-gray-900 to-gray-800 text-white overflow-hidden relative">
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-8" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Building2 className="h-5 w-5" />
                                Alquiler de Espacios
                            </CardTitle>
                            <CardDescription className="text-gray-300">
                                ¿Buscas un lugar para tus eventos o talleres?
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Dialog open={isRentalDialogOpen} onOpenChange={setIsRentalDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20" variant="outline">
                                        Ver Salones Disponibles
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

                {/* Right Column: Wellness Hub (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="bg-[#fcfbf7] border-none shadow-md h-full">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl text-secondary flex items-center gap-2">
                                    <Coffee className="h-5 w-5 text-primary" />
                                    Wellness Hub
                                </CardTitle>
                                <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">Nuevo</span>
                            </div>
                            <CardDescription>Recursos seleccionados para ti</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Daily Tip */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                                <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
                                    <Sun className="h-4 w-4" /> Tip del Día
                                </h4>
                                <p className="text-sm text-gray-600 italic">
                                    "Beber un vaso de agua antes de cada sesión ayuda a mejorar la concentración."
                                </p>
                            </div>

                            {/* Articles List */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-secondary text-sm uppercase tracking-wider">Lecturas Recomendadas</h4>
                                {wellnessArticles.map((article, i) => (
                                    <div key={i} className="group cursor-pointer p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${article.color}`}>
                                                {article.category}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{article.readTime}</span>
                                        </div>
                                        <h5 className="font-medium text-gray-800 group-hover:text-primary transition-colors flex items-center gap-2">
                                            {article.title}
                                        </h5>
                                        <div className="mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                                            Leer artículo <ArrowRight className="h-3 w-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button variant="outline" className="w-full text-secondary hover:text-primary border-dashed">
                                Ver más artículos
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;
