import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Video, Users, DollarSign, Calendar, TrendingUp, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Room {
    id: string;
    name: string;
    room_type: 'consultation' | 'event_hall' | 'virtual';
    hourly_rate: number;
}

interface RentalStats {
    total_rentals: number;
    total_revenue: number;
    total_hours: number;
    occupancy_rate: number;
    recent_rentals: Array<{
        renter_name: string;
        start_time: string;
        end_time: string;
        total_price: number;
        status: string;
        room_name?: string;
    }>;
}

export const RoomReports = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string>('all');
    const [stats, setStats] = useState<RentalStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    useEffect(() => {
        loadRooms();
    }, []);

    useEffect(() => {
        if (selectedRoom) {
            loadStats();
        }
    }, [selectedRoom, period]);

    const loadRooms = async () => {
        const { data, error } = await supabase
            .from('rooms')
            .select('id, name, room_type, hourly_rate')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            toast.error('Error al cargar espacios');
        } else {
            // @ts-ignore - Supabase types might not be fully synced yet
            setRooms(data as Room[] || []);
        }
    };

    const loadStats = async () => {
        if (!selectedRoom) return;

        setLoading(true);

        // Calcular fecha de inicio según período
        const now = new Date();
        const startDate = new Date();

        if (period === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        } else {
            startDate.setFullYear(now.getFullYear() - 1);
        }

        // Obtener reservas del período
        const { data: rentals, error } = await supabase
            .from('room_rentals')
            .select('*')
            .eq('room_id', selectedRoom)
            .gte('start_time', startDate.toISOString())
            .order('start_time', { ascending: false });

        if (error) {
            toast.error('Error al cargar estadísticas');
            setLoading(false);
            return;
        }

        // Calcular estadísticas
        const totalRentals = rentals?.length || 0;
        const totalRevenue = rentals?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;

        // Calcular horas totales
        let totalHours = 0;
        rentals?.forEach(rental => {
            const start = new Date(rental.start_time);
            const end = new Date(rental.end_time);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
        });

        // Calcular tasa de ocupación (aproximada)
        const numberOfRooms = selectedRoom === 'all' ? (rooms.length || 1) : 1;
        const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : 365;
        const availableHours = daysInPeriod * 12 * numberOfRooms;
        const occupancyRate = availableHours > 0 ? (totalHours / availableHours) * 100 : 0;

        // Obtener últimas 10 reservas
        const recentRentals = rentals?.slice(0, 10).map((r: any) => ({
            renter_name: r.renter_name,
            start_time: r.start_time,
            end_time: r.end_time,
            total_price: r.total_price,
            status: r.status,
            room_name: r.rooms?.name
        })) || [];

        setStats({
            total_rentals: totalRentals,
            total_revenue: totalRevenue,
            total_hours: Math.round(totalHours),
            occupancy_rate: Math.round(occupancyRate),
            recent_rentals: recentRentals
        });

        setLoading(false);
    };

    const getRoomTypeIcon = (type: Room['room_type']) => {
        if (type === 'virtual') return <Video className="h-4 w-4" />;
        if (type === 'event_hall') return <Users className="h-4 w-4" />;
        return <Building2 className="h-4 w-4" />;
    };

    const formatCOP = (amount: number) => {
        return `$${amount.toLocaleString('es-CO')} COP`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
            pending: 'secondary',
            confirmed: 'default',
            cancelled: 'destructive',
            completed: 'default'
        };

        const labels: Record<string, string> = {
            pending: 'Pendiente',
            confirmed: 'Confirmada',
            cancelled: 'Cancelada',
            completed: 'Completada'
        };

        return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Reportes de Espacios
                        </CardTitle>
                        <CardDescription>Estadísticas de uso e ingresos por consultorio</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Última semana</SelectItem>
                                <SelectItem value="month">Último mes</SelectItem>
                                <SelectItem value="year">Último año</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Selector de espacio */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Selecciona un espacio</Label>
                        <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Todos los espacios (General)
                                    </div>
                                </SelectItem>
                                {rooms.map((room) => (
                                    <SelectItem key={room.id} value={room.id}>
                                        <div className="flex items-center gap-2">
                                            {getRoomTypeIcon(room.room_type)}
                                            {room.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <p className="text-center text-muted-foreground py-8">Cargando estadísticas...</p>
                    ) : stats ? (
                        <>
                            {/* Métricas principales */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Total Reservas</p>
                                        </div>
                                        <p className="text-3xl font-bold">{stats.total_rentals}</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Ingresos</p>
                                        </div>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatCOP(stats.total_revenue)}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Horas Alquiladas</p>
                                        </div>
                                        <p className="text-3xl font-bold">{stats.total_hours}h</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Ocupación</p>
                                        </div>
                                        <p className="text-3xl font-bold">{stats.occupancy_rate}%</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Reservas recientes */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Reservas Recientes</h3>
                                {stats.recent_rentals.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">
                                        No hay reservas en este período
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {stats.recent_rentals.map((rental, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-medium">{rental.renter_name}</p>
                                                        {rental.room_name && (
                                                            <Badge variant="outline" className="text-xs font-normal">
                                                                {rental.room_name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(rental.start_time)} - {new Date(rental.end_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="font-semibold text-green-600">
                                                        {formatCOP(rental.total_price)}
                                                    </p>
                                                    {getStatusBadge(rental.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            Selecciona un espacio para ver estadísticas
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

function Label({ className, children, ...props }: any) {
    return <label className={className} {...props}>{children}</label>;
}
