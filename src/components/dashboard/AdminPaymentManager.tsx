import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    status: string;
    appointment_id: string;
    appointments?: {
        patient_profiles?: {
            profiles?: {
                full_name: string;
            }
        }
    }
}

interface Rental {
    id: string;
    doctor_id: string;
    room_id: string;
    start_time: string;
    end_time: string;
    status?: string; // pending, paid, etc (mocked if not exists)
    total_cost?: number; // mocked if not exists
    rooms?: {
        name: string;
        room_type: string;
    };
    doctor_profiles?: {
        profiles?: {
            full_name: string;
        }
    };
}

export const AdminPaymentManager = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchPayments(), fetchRentals()]);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Error al cargar información financiera');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        const { data, error } = await supabase
            .from('payments')
            .select(`
                id,
                amount,
                payment_date,
                payment_method,
                status,
                appointment_id,
                appointments (
                    patient_profiles (
                        profiles (
                            full_name
                        )
                    )
                )
            `)
            .order('payment_date', { ascending: false });

        if (error) throw error;
        setPayments(data as any || []);
    };

    const fetchRentals = async () => {
        // Fetch rentals - casting as any because Types might not be updated yet
        // We join with rooms and doctor_profiles -> profiles
        const { data, error } = await supabase
            .from('room_rentals' as any)
            .select(`
                *,
                rooms ( name, room_type ),
                doctor_profiles ( 
                    profiles ( full_name ) 
                )
            `)
            .order('start_time', { ascending: false });

        if (error) {
            console.error("Rentals fetch error:", error);
            // Don't throw to avoid blocking payments view
            return;
        }

        setRentals(data || []);
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Efectivo';
            case 'card': return 'Tarjeta';
            case 'transfer': return 'Transferencia';
            default: return method;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Procesado</Badge>;
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pendiente</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-semibold">Gestión de Cobros</h3>
                    <p className="text-sm text-muted-foreground">Supervisa los ingresos por citas y alquileres de espacios.</p>
                </div>
            </div>

            <Tabs defaultValue="appointments" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="appointments">Citas Médicas</TabsTrigger>
                    <TabsTrigger value="rentals">Alquiler de Consultorios</TabsTrigger>
                </TabsList>

                <TabsContent value="appointments" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pagos de Pacientes</CardTitle>
                            <CardDescription>Historial de transacciones por consultas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Paciente</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Monto</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell>
                                        </TableRow>
                                    ) : payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay pagos registrados</TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map((payment) => (
                                            <TableRow key={payment.id}>
                                                <TableCell>
                                                    {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {payment.appointments?.patient_profiles?.profiles?.full_name || 'Desconocido'}
                                                </TableCell>
                                                <TableCell>{getMethodLabel(payment.payment_method)}</TableCell>
                                                <TableCell className="font-bold">
                                                    ${payment.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(payment.status)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="rentals" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cobros de Espacios</CardTitle>
                            <CardDescription>Pagos pendientes y realizados por uso de consultorios.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha Uso</TableHead>
                                        <TableHead>Médico</TableHead>
                                        <TableHead>Espacio</TableHead>
                                        <TableHead>Horario</TableHead>
                                        <TableHead>Estado Pago</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell>
                                        </TableRow>
                                    ) : rentals.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay alquileres registrados</TableCell>
                                        </TableRow>
                                    ) : (
                                        rentals.map((rental) => (
                                            <TableRow key={rental.id}>
                                                <TableCell>
                                                    {format(new Date(rental.start_time), "dd/MM/yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {rental.doctor_profiles?.profiles?.full_name || 'Dr. Desconocido'}
                                                </TableCell>
                                                <TableCell>
                                                    {rental.rooms?.name || 'Sala'}
                                                    <span className="text-xs text-muted-foreground block">{rental.rooms?.room_type}</span>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {format(new Date(rental.start_time), "HH:mm", { locale: es })} -
                                                    {format(new Date(rental.end_time), "HH:mm", { locale: es })}
                                                </TableCell>
                                                <TableCell>
                                                    {/* Mocking logic since we lack specific rental payment status in schema yet */}
                                                    {new Date(rental.end_time) < new Date() ? (
                                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                            <AlertCircle className="h-3 w-3 mr-1" /> Pendiente
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                            Agendado
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
