import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Stethoscope,
    Phone,
    MessageCircle,
    Mail,
    Calendar,
    Clock,
    Search,
    User,
    CheckCircle,
    XCircle
} from 'lucide-react';

interface Doctor {
    id: string;
    specialty: string;
    bio: string | null;
    license_number: string | null;
    user_id: string;
    profile?: {
        full_name: string;
        email: string;
        phone: string | null;
    };
}

interface DoctorAppointment {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    patient_name: string;
}

export const ReceptionistDoctorManager = () => {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [doctorAppointments, setDoctorAppointments] = useState<DoctorAppointment[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, []);

    useEffect(() => {
        if (selectedDoctor) {
            fetchDoctorAppointments(selectedDoctor.id);
        }
    }, [selectedDoctor]);

    const fetchDoctors = async () => {
        setLoading(true);

        // Get doctor profiles
        const { data: doctorProfiles, error: doctorError } = await supabase
            .from('doctor_profiles')
            .select('id, specialty, bio, license_number, user_id')
            .order('specialty', { ascending: true });

        if (doctorError) {
            toast.error('Error al cargar médicos');
            setLoading(false);
            return;
        }

        // Get user profiles
        const userIds = doctorProfiles?.map(d => d.user_id) || [];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone')
            .in('user_id', userIds);

        // Combine data
        const doctorsWithProfiles = doctorProfiles?.map(doctor => ({
            ...doctor,
            profile: profiles?.find(p => p.user_id === doctor.user_id)
        })) || [];

        setDoctors(doctorsWithProfiles);
        setLoading(false);
    };

    const fetchDoctorAppointments = async (doctorId: string) => {
        setLoadingAppointments(true);
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('id, start_time, end_time, status, patient_id, external_patient_name')
            .eq('doctor_id', doctorId)
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .order('start_time', { ascending: true });

        if (error) {
            toast.error('Error al cargar agenda');
            setLoadingAppointments(false);
            return;
        }

        // Get patient names
        const patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
        const { data: patientProfiles } = await supabase
            .from('patient_profiles')
            .select('id, user_id')
            .in('id', patientIds);

        const patientUserIds = patientProfiles?.map(p => p.user_id) || [];
        const { data: patientUsers } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', patientUserIds);

        const appointmentsWithPatients = appointments?.map(apt => {
            const patientProfile = patientProfiles?.find(p => p.id === apt.patient_id);
            const patientUser = patientUsers?.find(u => u.user_id === patientProfile?.user_id);
            const patientName = apt.external_patient_name || patientUser?.full_name || 'Paciente';

            return {
                ...apt,
                patient_name: patientName
            };
        }) || [];

        setDoctorAppointments(appointmentsWithPatients);
        setLoadingAppointments(false);
    };

    const filteredDoctors = doctors.filter(doctor =>
        doctor.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const config = {
            scheduled: { label: 'Agendada', color: 'bg-slate-100 text-slate-700' },
            confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
            checked_in: { label: 'En Espera', color: 'bg-yellow-100 text-yellow-700' },
            in_progress: { label: 'En Consulta', color: 'bg-purple-100 text-purple-700' },
            completed: { label: 'Completada', color: 'bg-green-100 text-green-700' },
            cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' }
        };

        const statusInfo = config[status as keyof typeof config] || config.scheduled;
        return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="border-teal-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-100">
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Stethoscope className="h-6 w-6 text-teal-600" />
                        Directorio de Médicos
                    </CardTitle>
                    <CardDescription>
                        Contacta médicos y consulta su disponibilidad
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, especialidad o email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Doctor List */}
                <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                        Médicos Afiliados ({filteredDoctors.length})
                    </h3>

                    {loading ? (
                        <p className="text-center text-muted-foreground py-8">Cargando médicos...</p>
                    ) : filteredDoctors.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            {searchQuery ? 'No se encontraron resultados' : 'No hay médicos afiliados'}
                        </p>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {filteredDoctors.map((doctor) => (
                                <Card
                                    key={doctor.id}
                                    className={`cursor-pointer transition-all hover:shadow-md ${selectedDoctor?.id === doctor.id
                                        ? 'border-teal-500 bg-teal-50/50'
                                        : 'border-slate-200 hover:border-teal-300'
                                        }`}
                                    onClick={() => setSelectedDoctor(doctor)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                {doctor.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'Dr'}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-900 truncate">
                                                    {doctor.profile?.full_name || 'Doctor'}
                                                </p>
                                                <Badge variant="outline" className="text-xs mt-1">
                                                    {doctor.specialty}
                                                </Badge>
                                                {doctor.profile?.email && (
                                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                                        {doctor.profile.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Doctor Details & Schedule */}
                <div className="lg:col-span-2">
                    {selectedDoctor ? (
                        <Tabs defaultValue="info" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="info">Información</TabsTrigger>
                                <TabsTrigger value="schedule">Agenda del Día</TabsTrigger>
                            </TabsList>

                            <TabsContent value="info" className="space-y-4">
                                <Card>
                                    <CardHeader className="bg-gradient-to-r from-teal-50 to-white">
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-teal-600" />
                                            {selectedDoctor.profile?.full_name}
                                        </CardTitle>
                                        <CardDescription>
                                            {selectedDoctor.specialty}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        {/* Bio */}
                                        {selectedDoctor.bio && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Biografía</h4>
                                                <p className="text-sm text-slate-600">{selectedDoctor.bio}</p>
                                            </div>
                                        )}

                                        {/* License */}
                                        {selectedDoctor.license_number && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Licencia Médica</h4>
                                                <p className="text-sm text-slate-600">{selectedDoctor.license_number}</p>
                                            </div>
                                        )}

                                        {/* Contact Info */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Información de Contacto</h4>
                                            <div className="space-y-2">
                                                {selectedDoctor.profile?.email && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Mail className="h-4 w-4 text-slate-500" />
                                                        <span className="text-slate-600">{selectedDoctor.profile.email}</span>
                                                    </div>
                                                )}
                                                {selectedDoctor.profile?.phone && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Phone className="h-4 w-4 text-slate-500" />
                                                        <span className="text-slate-600">{selectedDoctor.profile.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Buttons */}
                                        <div className="pt-4 border-t">
                                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Acciones Rápidas</h4>
                                            <div className="flex gap-3">
                                                {selectedDoctor.profile?.phone && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                                            onClick={() => {
                                                                const phone = selectedDoctor.profile?.phone?.replace(/\D/g, '');
                                                                window.open(`https://wa.me/${phone}`, '_blank');
                                                            }}
                                                        >
                                                            <MessageCircle className="h-4 w-4 mr-2" />
                                                            WhatsApp
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                                            onClick={() => {
                                                                window.location.href = `tel:${selectedDoctor.profile?.phone}`;
                                                            }}
                                                        >
                                                            <Phone className="h-4 w-4 mr-2" />
                                                            Llamar
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="schedule" className="space-y-4">
                                <Card>
                                    <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-blue-600" />
                                            Agenda de Hoy
                                        </CardTitle>
                                        <CardDescription>
                                            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {loadingAppointments ? (
                                            <p className="text-center text-muted-foreground py-8">Cargando agenda...</p>
                                        ) : doctorAppointments.length === 0 ? (
                                            <div className="text-center py-12">
                                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                                <p className="text-slate-600 font-medium">Sin citas programadas hoy</p>
                                                <p className="text-sm text-muted-foreground">El médico está disponible</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {doctorAppointments.map((apt) => (
                                                    <div
                                                        key={apt.id}
                                                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex items-start gap-3 flex-1">
                                                                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="font-semibold text-slate-900">
                                                                            {format(parseISO(apt.start_time), 'HH:mm')} - {format(parseISO(apt.end_time), 'HH:mm')}
                                                                        </p>
                                                                        {getStatusBadge(apt.status)}
                                                                    </div>
                                                                    <p className="text-sm text-slate-600">
                                                                        Paciente: {apt.patient_name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <Card className="h-full flex items-center justify-center min-h-[400px]">
                            <CardContent className="text-center">
                                <Stethoscope className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-600 font-medium">Selecciona un médico</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Elige un médico de la lista para ver su información y agenda
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
