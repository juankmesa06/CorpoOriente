
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, Clock, DollarSign, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface RoomRental {
    id: string;
    room_id: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
    purpose: string;
    rooms: {
        name: string;
        room_type: string;
    };
}

export const DoctorRoomRentals = () => {
    const { user } = useAuth();
    const [rentals, setRentals] = useState<RoomRental[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchRentals();
        }
    }, [user]);

    const fetchRentals = async () => {
        try {
            const { data, error } = await supabase
                .from('room_rentals' as any)
                .select(`
                    id,
                    room_id,
                    start_time,
                    end_time,
                    total_price,
                    status,
                    purpose,
                    rooms (
                        name,
                        room_type
                    )
                `)
                .eq('user_id', user?.id)
                .order('start_time', { ascending: false });

            if (error) throw error;
            setRentals((data as any) || []);
        } catch (error) {
            console.error('Error fetching rentals:', error);
            toast.error('Error al cargar tus reservas de espacio');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">Confirmado</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">Pendiente</Badge>;
            case 'cancelled':
                return <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200">Cancelado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return <div className="p-4 text-center text-slate-500">Cargando reservas...</div>;
    }

    return (
        <Card className="border-none shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-teal-600" />
                    Mis Reservas de Espacio
                </CardTitle>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                    {rentals.length} Reservas
                </Badge>
            </CardHeader>
            <CardContent>
                {rentals.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No tienes reservas activas</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Reserva un consultorio por horas cuando lo necesites.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {rentals.map((rental) => (
                            <div
                                key={rental.id}
                                className="group p-4 rounded-xl border border-slate-100 bg-white hover:border-teal-100 hover:shadow-md transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg group-hover:scale-105 transition-transform">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{rental.rooms?.name || 'Consultorio'}</h4>
                                            <p className="text-xs text-slate-500">{rental.purpose || 'Uso profesional'}</p>
                                        </div>
                                    </div>
                                    {getStatusBadge(rental.status)}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3 pl-12 text-xs text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                        <span>
                                            {format(new Date(rental.start_time), "d MMM, h:mm a", { locale: es })} -
                                            {format(new Date(rental.end_time), "h:mm a")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-medium text-emerald-600">
                                        <DollarSign className="h-3.5 w-3.5" />
                                        <span>{formatCurrency(rental.total_price)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
