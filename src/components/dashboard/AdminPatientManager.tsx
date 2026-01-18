import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, Video, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PatientAppointment {
    id: string;
    start_time: string;
    is_virtual: boolean;
    status: string;
    patient_profiles: {
        profiles: {
            full_name: string;
            email: string;
        } | null;
    } | null;
    payments: {
        amount: number;
        status: string;
    }[];
}

export const AdminPatientManager = () => {
    const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id,
                    start_time,
                    is_virtual,
                    status,
                    patient_profiles (
                        profiles (
                            full_name,
                            email
                        )
                    ),
                    payments (
                        amount,
                        status
                    )
                `)
                .order('start_time', { ascending: false })
                .limit(50);

            if (error) throw error;

            console.log('Appointments data:', data);
            setAppointments(data as any || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge className="bg-green-500">Completada</Badge>;
            case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendiente</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gestión de Pacientes y Pagos
                </CardTitle>
                <CardDescription>
                    Historial de citas, consultas y pagos realizados por los pacientes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No hay registros de citas recientes.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo de Cita</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Pago</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appointments.map((apt) => {
                                    const patientName = apt.patient_profiles?.profiles?.full_name || 'Desconocido';
                                    const patientEmail = apt.patient_profiles?.profiles?.email || '';
                                    const payment = apt.payments?.[0]; // Assuming 1 payment per appointment

                                    return (
                                        <TableRow key={apt.id}>
                                            <TableCell>
                                                <div className="font-medium">{patientName}</div>
                                                <div className="text-xs text-muted-foreground">{patientEmail}</div>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(apt.start_time), "d MMM yyyy, h:mm a", { locale: es })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {apt.is_virtual ? (
                                                        <>
                                                            <Video className="h-4 w-4 text-primary" />
                                                            <span className="text-sm">Virtual</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <MapPin className="h-4 w-4 text-green-600" />
                                                            <span className="text-sm">Presencial</span>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(apt.status)}
                                            </TableCell>
                                            <TableCell>
                                                {payment ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-green-700 flex items-center gap-1">
                                                            <DollarSign className="h-3 w-3" />
                                                            {formatCurrency(payment.amount)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground capitalize">
                                                            {payment.status}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Sin pago</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
