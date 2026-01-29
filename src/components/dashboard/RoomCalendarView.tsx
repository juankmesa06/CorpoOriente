import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Loader2, Building2, Clock, TrendingUp, Activity, ChevronLeft, MapPin, Users } from 'lucide-react';

interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor?: string;
    borderColor?: string;
    extendedProps?: {
        doctorName?: string;
        patientName?: string;
        appointmentId?: string;
        type: 'appointment' | 'blocked';
    };
}

interface Room {
    id: string;
    name: string;
    room_type: string;
    capacity: number;
    price_per_hour: number;
    price_per_session: number;
    is_active: boolean;
    photos?: string[];
    description?: string;
}

export const RoomCalendarView = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRooms: 0,
        occupied: 0,
        available: 0,
        utilizationRate: 0
    });

    // Fetch all rooms
    const fetchRooms = async () => {
        setLoading(true);
        try {
            const { data: roomsData, error: roomsError } = await supabase
                .from('rooms')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (roomsError) throw roomsError;

            setRooms(roomsData || []);
            setRooms(roomsData || []);

            // Calculate stats
            const now = new Date().toISOString();

            // Get occupied rooms by appointments
            const { data: occupiedByApts } = await supabase
                .from('appointments')
                .select('room_id')
                .lte('start_time', now)
                .gte('end_time', now)
                .not('room_id', 'is', null);

            // Get occupied rooms by rentals
            const { data: occupiedByRentals } = await supabase
                .from('room_rentals' as any)
                .select('room_id')
                .lte('start_time', now)
                .gte('end_time', now);

            const occupiedIds = new Set([
                ...(occupiedByApts?.map((a: any) => a.room_id) || []),
                ...(occupiedByRentals?.map((r: any) => r.room_id) || [])
            ]);

            const total = (roomsData || []).length;
            const occupied = occupiedIds.size;
            const available = Math.max(0, total - occupied);
            const utilization = total > 0 ? Math.round((occupied / total) * 100) : 0;

            setStats({
                totalRooms: total,
                occupied: occupied,
                available: available,
                utilizationRate: utilization
            });

        } catch (error: any) {
            console.error('Error fetching rooms:', error);
            toast.error('Error al cargar los consultorios');
        } finally {
            setLoading(false);
        }
    };

    // Fetch events for a specific room
    const fetchRoomEvents = async (roomId: string) => {
        try {
            const today = new Date();
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);

            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('appointments')
                .select(`
                    id,
                    start_time,
                    end_time,
                    status,
                    doctor_profiles!inner(id, user_id),
                    patient_profiles!inner(id, user_id)
                `)
                .eq('room_id', roomId)
                .gte('start_time', today.toISOString())
                .lte('start_time', nextMonth.toISOString())
                .in('status', ['confirmed', 'completed', 'scheduled']);

            if (appointmentsError) throw appointmentsError;

            // Fetch doctor and patient names
            const appointmentEvents: CalendarEvent[] = await Promise.all(
                (appointmentsData || []).map(async (appointment) => {
                    const { data: doctorProfile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('user_id', appointment.doctor_profiles.user_id)
                        .single();

                    const { data: patientProfile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('user_id', appointment.patient_profiles.user_id)
                        .single();

                    return {
                        id: appointment.id,
                        title: `${doctorProfile?.full_name || 'Doctor'} - ${patientProfile?.full_name || 'Paciente'}`,
                        start: appointment.start_time,
                        end: appointment.end_time,
                        backgroundColor: appointment.status === 'completed' ? '#10b981' : '#3b82f6',
                        borderColor: appointment.status === 'completed' ? '#059669' : '#2563eb',
                        extendedProps: {
                            doctorName: doctorProfile?.full_name,
                            patientName: patientProfile?.full_name,
                            appointmentId: appointment.id,
                            type: 'appointment' as const
                        }
                    };
                })
            );

            setEvents(appointmentEvents);
        } catch (error: any) {
            console.error('Error fetching room events:', error);
            toast.error('Error al cargar las citas');
        }
    };

    // Handle room selection
    const handleRoomSelect = async (room: Room) => {
        setSelectedRoom(room);
        await fetchRoomEvents(room.id);
    };

    // Handle back to list
    const handleBackToList = () => {
        setSelectedRoom(null);
        setEvents([]);
    };

    // Get room type badge
    const getRoomTypeBadge = (type: string) => {
        switch (type) {
            case 'consultation': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Consultorio</Badge>;
            case 'physical': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Físico</Badge>;
            case 'event_hall': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Salón</Badge>;
            case 'virtual': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Virtual</Badge>;
            default: return <Badge variant="outline">{type}</Badge>;
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Enhanced Header with Gradient Background */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 p-8 shadow-2xl">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Calendar className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
                                    {selectedRoom ? selectedRoom.name : 'Calendario de Consultorios'}
                                </h2>
                                <p className="text-teal-50 text-sm font-medium mt-1">
                                    {selectedRoom ? 'Vista del calendario individual' : 'Selecciona un consultorio para ver su calendario'}
                                </p>
                            </div>
                        </div>
                        {selectedRoom && (
                            <Button
                                onClick={handleBackToList}
                                variant="secondary"
                                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Volver a la lista
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {!selectedRoom ? (
                <>
                    {/* Enhanced Stats Cards with Icons and Visual Identity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Rooms Card */}
                        <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-full -mr-16 -mt-16"></div>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Consultorios</CardTitle>
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Building2 className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-slate-900 mb-1">{stats.totalRooms}</div>
                                <p className="text-xs text-slate-500 font-medium">Espacios registrados</p>
                            </CardContent>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                        </Card>

                        {/* Occupied Card */}
                        <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-full -mr-16 -mt-16"></div>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Ocupados Ahora</CardTitle>
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <Activity className="h-5 w-5 text-red-600" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-red-600 mb-1">{stats.occupied}</div>
                                <p className="text-xs text-slate-500 font-medium">En uso este momento</p>
                            </CardContent>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
                        </Card>

                        {/* Available Card */}
                        <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-full -mr-16 -mt-16"></div>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Disponibles</CardTitle>
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <Clock className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-emerald-600 mb-1">{stats.available}</div>
                                <p className="text-xs text-slate-500 font-medium">Listos para usar</p>
                            </CardContent>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
                        </Card>

                        {/* Utilization Rate Card */}
                        <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-violet-600/5 rounded-full -mr-16 -mt-16"></div>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Tasa de Uso</CardTitle>
                                    <div className="p-2 bg-violet-100 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-violet-600" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-1">
                                    <div className="text-4xl font-bold text-violet-600">{stats.utilizationRate}</div>
                                    <div className="text-2xl font-bold text-violet-600">%</div>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-1">Eficiencia operativa</p>
                            </CardContent>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-violet-600"></div>
                        </Card>
                    </div>

                    {/* Room List Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map((room) => (
                            <Card
                                key={room.id}
                                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-teal-400 group"
                                onClick={() => handleRoomSelect(room)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2 flex-1">
                                            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                                                {room.name}
                                            </CardTitle>
                                            {getRoomTypeBadge(room.room_type)}
                                        </div>
                                        <div className="p-3 bg-teal-100 rounded-xl group-hover:bg-teal-200 transition-colors">
                                            <MapPin className="h-6 w-6 text-teal-600" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {room.description && (
                                        <p className="text-sm text-slate-600 line-clamp-2">{room.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-4 w-4 text-slate-500" />
                                            <span className="font-medium text-slate-700">{room.capacity} personas</span>
                                        </div>
                                        <div className="text-slate-500">|</div>
                                        <div className="font-semibold text-teal-600">
                                            ${room.price_per_hour?.toLocaleString()}/hora
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white group-hover:shadow-lg transition-shadow"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRoomSelect(room);
                                        }}
                                    >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Ver Calendario
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {rooms.length === 0 && (
                        <Card className="border-2 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <Building2 className="h-16 w-16 text-slate-300 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay consultorios disponibles</h3>
                                <p className="text-sm text-slate-500">Crea consultorios desde la sección de gestión de salas</p>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <>
                    {/* Selected Room Info */}
                    <Card className="border-none shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-teal-100 rounded-lg">
                                        <MapPin className="h-5 w-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{selectedRoom.name}</CardTitle>
                                        <div className="flex items-center gap-3 mt-2">
                                            {getRoomTypeBadge(selectedRoom.room_type)}
                                            <span className="text-sm text-slate-600">
                                                <Users className="h-4 w-4 inline mr-1" />
                                                {selectedRoom.capacity} personas
                                            </span>
                                            <span className="text-sm font-semibold text-teal-600">
                                                ${selectedRoom.price_per_hour?.toLocaleString()}/hora
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Calendar */}
                    <Card className="border-none shadow-xl overflow-hidden">
                        <CardContent className="p-6 bg-white overflow-x-auto">
                            <div className="min-w-[800px]">
                                <FullCalendar
                                    plugins={[dayGridPlugin, interactionPlugin]}
                                    initialView="dayGridMonth"
                                    locale={esLocale}
                                    events={events}
                                    headerToolbar={{
                                        left: 'prev,next today',
                                        center: 'title',
                                        right: 'dayGridMonth,dayGridWeek,dayGridDay'
                                    }}
                                    height="auto"
                                    editable={false}
                                    eventClick={(info) => {
                                        toast.info(`Cita: ${info.event.title}`);
                                    }}
                                    nowIndicator={true}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Legend */}
                    <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-slate-100 rounded">
                                        <Activity className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <h4 className="font-semibold text-slate-900 text-sm">Leyenda</h4>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500 border-2 border-blue-600 shadow-sm"></div>
                                    <span className="text-sm font-medium text-slate-700">Confirmada</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-green-500 border-2 border-green-600 shadow-sm"></div>
                                    <span className="text-sm font-medium text-slate-700">Completada</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};
