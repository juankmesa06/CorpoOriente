import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { Building2, Calendar, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Rental {
    id: string;
    start_time: string;
    end_time: string;
    purpose: string;
    rooms: {
        name: string;
        room_type: string;
    };
    status: string;
}

interface DoctorRentalsProps {
    className?: string;
}

export const DoctorRentals = ({ className }: DoctorRentalsProps) => {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchRentals();
    }, []);

    const fetchRentals = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: doctorProfile } = await supabase
                .from('doctor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (doctorProfile) {
                const { data, error } = await supabase
                    .from('room_rentals' as any) // Casting as any until types are generated
                    .select('*, rooms(name, room_type)')
                    .eq('user_id', user.id)
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(5);

                if (error) throw error;
                setRentals((data as any) || []);
            }
        } catch (error) {
            console.error('Error fetching rentals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRentalSuccess = () => {
        setIsDialogOpen(false);
        fetchRentals(); // Refresh list
        // Optional: Trigger global refresh if needed, but local refresh is better UX
    };

    return (
        <Card className={`bg-white border-primary/20 shadow-sm h-full flex flex-col ${className || ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl text-secondary flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Mis Espacios
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-white">
                            <Plus className="h-4 w-4 mr-1" />
                            Nuevo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Reserva tu Espacio</DialogTitle>
                        </DialogHeader>
                        <RoomRentalBooking onSuccess={handleRentalSuccess} />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-1">
                {loading ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">Cargando...</div>
                ) : rentals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <p>No tienes alquileres próximos.</p>
                        <p className="text-xs mt-1">¡Reserva un consultorio para atender a tus pacientes!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rentals.map((rental) => (
                            <div key={rental.id} className="flex items-start justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="space-y-1">
                                    <div className="font-medium text-secondary">
                                        {rental.rooms?.name || 'Sala Desconocida'}
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span>{format(new Date(rental.start_time), "d 'de' MMMM", { locale: es })}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {format(new Date(rental.start_time), "HH:mm", { locale: es })} -
                                            {format(new Date(rental.end_time), "HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                    {rental.purpose && (
                                        <div className="text-xs text-primary font-medium mt-1">
                                            {rental.purpose}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rental.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                            rental.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}>
                                        {rental.status === 'confirmed' ? 'Confirmado' :
                                            rental.status === 'pending' ? 'Pendiente' : rental.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
