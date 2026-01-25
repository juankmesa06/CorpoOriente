import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Calendar,
    Search,
    Filter,
    Clock,
    User,
    Stethoscope,
    Phone,
    Mail,
    ChevronLeft,
    ChevronRight,
    CalendarPlus
} from 'lucide-react';
import { AdminAppointmentBooking } from './AdminAppointmentBooking';

interface Appointment {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    appointment_type: string;
    notes: string | null;
    patient_id: string;
    doctor_id: string;
    patient_profile?: {
        full_name: string;
        email: string;
        phone: string | null;
    };
    doctor_profile?: {
        full_name: string;
        specialty: string;
    };
}

export const ReceptionistAppointmentManager = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchAppointments();
    }, [selectedDate, statusFilter]);

    const fetchAppointments = async () => {
        setLoading(true);

        const startDate = startOfDay(selectedDate).toISOString();
        const endDate = endOfDay(selectedDate).toISOString();

        let query = supabase
            .from('appointments')
            .select('id, start_time, end_time, status, appointment_type, notes, patient_id, doctor_id')
            .gte('start_time', startDate)
            .lte('start_time', endDate)
            .order('start_time', { ascending: true });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) {
            toast.error('Error al cargar citas');
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

            return {
                ...apt,
                patient_profile: patientUsers?.find(u => u.user_id === patientProfile?.user_id),
                doctor_profile: {
                    full_name: doctorUsers?.find(u => u.user_id === doctorProfile?.user_id)?.full_name,
                    specialty: doctorProfile?.specialty
                }
            };
        }) || [];

        setAppointments(appointmentsWithProfiles);
        setLoading(false);
    };

    const filteredAppointments = appointments.filter(apt =>
        apt.patient_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.doctor_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.doctor_profile?.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const config = {
            scheduled: { label: 'Agendada', color: 'bg-slate-100 text-slate-700' },
            confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
            checked_in: { label: 'En Espera', color: 'bg-yellow-100 text-yellow-700' },
            in_progress: { label: 'En Consulta', color: 'bg-purple-100 text-purple-700' },
            completed: { label: 'Completada', color: 'bg-green-100 text-green-700' },
            cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
            no_show: { label: 'No Asistió', color: 'bg-gray-100 text-gray-700' }
        };

        const statusInfo = config[status as keyof typeof config] || config.scheduled;
        return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
    };

    const changeDate = (days: number) => {
        setSelectedDate(prev => addDays(prev, days));
    };

    return (
        <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="list" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Citas Programadas
                </TabsTrigger>
                <TabsTrigger value="new" className="flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Agendar Nueva Cita
                </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
                {/* Filters */}
                <Card className="border-teal-200 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-100">
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-teal-600" />
                            Filtros y Búsqueda
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Date Navigation */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Fecha</label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => changeDate(-1)}
                                        className="h-10 w-10 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex-1 text-center">
                                        <p className="font-semibold text-slate-900">
                                            {format(selectedDate, "d 'de' MMMM", { locale: es })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(selectedDate, 'EEEE', { locale: es })}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => changeDate(1)}
                                        className="h-10 w-10 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedDate(new Date())}
                                    className="w-full mt-2 text-teal-600"
                                >
                                    Hoy
                                </Button>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Estado</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los estados</SelectItem>
                                        <SelectItem value="scheduled">Agendada</SelectItem>
                                        <SelectItem value="confirmed">Confirmada</SelectItem>
                                        <SelectItem value="checked_in">En Espera</SelectItem>
                                        <SelectItem value="in_progress">En Consulta</SelectItem>
                                        <SelectItem value="completed">Completada</SelectItem>
                                        <SelectItem value="cancelled">Cancelada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Search */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Buscar</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Paciente, médico, especialidad..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Appointments List */}
                <Card>
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Citas del Día
                            </CardTitle>
                            <Badge variant="outline" className="text-sm">
                                {filteredAppointments.length} citas
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {loading ? (
                            <p className="text-center text-muted-foreground py-12">Cargando citas...</p>
                        ) : filteredAppointments.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-600 font-medium">No hay citas programadas</p>
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery ? 'Intenta con otra búsqueda' : 'para esta fecha'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredAppointments.map((apt) => (
                                    <div
                                        key={apt.id}
                                        className="p-5 border-2 border-slate-100 rounded-xl hover:border-teal-200 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                {/* Time */}
                                                <div className="flex flex-col items-center bg-teal-50 rounded-lg p-3 min-w-[80px]">
                                                    <Clock className="h-5 w-5 text-teal-600 mb-1" />
                                                    <p className="font-bold text-teal-900 text-lg">
                                                        {format(parseISO(apt.start_time), 'HH:mm')}
                                                    </p>
                                                    <p className="text-xs text-teal-600">
                                                        {format(parseISO(apt.end_time), 'HH:mm')}
                                                    </p>
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {getStatusBadge(apt.status)}
                                                        <Badge variant="outline" className="text-xs">
                                                            {apt.appointment_type === 'in_person' ? 'Presencial' : 'Virtual'}
                                                        </Badge>
                                                    </div>

                                                    {/* Patient */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <User className="h-4 w-4 text-slate-500" />
                                                        <span className="font-semibold text-slate-900">
                                                            {apt.patient_profile?.full_name || 'Paciente'}
                                                        </span>
                                                    </div>

                                                    {/* Doctor */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Stethoscope className="h-4 w-4 text-slate-500" />
                                                        <span className="text-sm text-slate-600">
                                                            {apt.doctor_profile?.full_name || 'Doctor'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            • {apt.doctor_profile?.specialty}
                                                        </span>
                                                    </div>

                                                    {/* Contact */}
                                                    {apt.patient_profile && (
                                                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                                            {apt.patient_profile.phone && (
                                                                <div className="flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    {apt.patient_profile.phone}
                                                                </div>
                                                            )}
                                                            {apt.patient_profile.email && (
                                                                <div className="flex items-center gap-1">
                                                                    <Mail className="h-3 w-3" />
                                                                    {apt.patient_profile.email}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Notes */}
                                                    {apt.notes && (
                                                        <p className="text-sm text-slate-600 mt-2 italic">
                                                            Nota: {apt.notes}
                                                        </p>
                                                    )}
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

            <TabsContent value="new">
                <AdminAppointmentBooking />
            </TabsContent>
        </Tabs>
    );
};
