
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Calendar, Clock, MapPin, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Rental {
    id: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: 'confirmed' | 'pending' | 'cancelled';
    room: {
        name: string;
        room_type: string;
    } | null;
}

export const MyRentalsList = () => {
    const { user } = useAuth();
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadRentals();
        }
    }, [user]);

    const loadRentals = async () => {
        try {
            const { data, error } = await supabase
                .from('room_rentals' as any)
                .select(`
                    id,
                    start_time,
                    end_time,
                    total_price,
                    status,
                    room:rooms (
                        name,
                        room_type
                    )
                `)
                .eq('user_id', user?.id)
                .order('start_time', { ascending: false });

            if (error) throw error;

            // Transform data to match interface if needed
            const formattedData = (data as any[]).map(item => ({
                ...item,
                room: item.room // Supabase returns single object for foreign key
            })) as Rental[];

            setRentals(formattedData);
        } catch (error) {
            console.error('Error loading rentals:', error);
            toast.error('No se pudieron cargar tus reservas');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Confirmado</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Pendiente</Badge>;
            case 'cancelled':
                return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">Cancelado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Cargando tus reservas...</p>
            </div>
        );
    }

    if (rentals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <Building2 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No tienes reservas activas</h3>
                <p className="text-slate-500 max-w-sm mt-1">
                    Cuando alquiles un espacio para tus eventos o consultas, aparecerá aquí.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {rentals.map((rental) => (
                <Card key={rental.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                            {/* Left Column: Room Info (Name & Icon) */}
                            <div className="p-4 md:p-6 flex-1 flex flex-col justify-center items-center md:items-start border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 md:max-w-xs text-center md:text-left">
                                <div className="p-3 bg-white rounded-xl shadow-sm mb-3 text-teal-600">
                                    {rental.room?.room_type === 'event_hall' ? <Building2 className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 leading-tight">
                                    {rental.room?.name || 'Espacio'}
                                </h4>
                                <p className="text-sm text-slate-500 mt-1 font-medium capitalize">
                                    {rental.room?.room_type === 'event_hall' ? 'Salón de Eventos' : 'Consultorio'}
                                </p>
                            </div>

                            {/* Right Column: Date, Time, Price, Status */}
                            <div className="p-4 md:p-6 flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 text-teal-700 font-bold capitalize text-lg">
                                            <Calendar className="h-5 w-5" />
                                            {format(new Date(rental.start_time), "EEEE d 'de' MMMM", { locale: es })}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                            <Clock className="h-4 w-4" />
                                            <span>
                                                {format(new Date(rental.start_time), 'h:mm a')} - {format(new Date(rental.end_time), 'h:mm a')}
                                            </span>
                                        </div>
                                    </div>
                                    {getStatusBadge(rental.status)}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-400 font-medium">Total Pagado:</span>
                                    </div>
                                    <span className="font-bold text-slate-900 text-lg">
                                        ${rental.total_price.toLocaleString('es-CO')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
