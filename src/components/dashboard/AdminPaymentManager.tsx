import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, CheckCircle2, Clock, AlertCircle, TrendingUp, CreditCard, Building2, MoreHorizontal, Edit, Trash2, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface RentalPayment {
    id: string;
    total_price: number;
    start_time: string;
    status: string;
    renter_name?: string;
    rooms?: {
        name: string;
    }
}

export const AdminPaymentManager = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [rentals, setRentals] = useState<RentalPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("patients");

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
            .order('payment_date', { ascending: false })
            .limit(100);

        if (error) throw error;
        setPayments(data as any || []);
    };

    const fetchRentals = async () => {
        const { data, error } = await supabase
            .from('room_rentals')
            .select(`
                id,
                total_price,
                start_time,
                status,
                renter_name,
                rooms (
                    name
                )
            `)
            .order('start_time', { ascending: false })
            .limit(100);

        if (error) throw error;
        setRentals(data as any || []);
    };

    const handleUpdateStatus = async (id: string, table: 'payments' | 'room_rentals', newStatus: string) => {
        try {
            const { error } = await supabase
                .from(table)
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Estado actualizado a ${newStatus}`);
            fetchData();
        } catch (error) {
            toast.error('Error al actualizar el estado');
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Efectivo';
            case 'card': return 'Tarjeta';
            case 'transfer': return 'Transferencia';
            default: return method || '---';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid':
            case 'confirmed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Procesado</Badge>;
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pendiente</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><Ban className="h-3 w-3 mr-1" /> Cancelado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Calculate Totals
    const totalPatientIncome = payments.filter(p => p.status === 'paid' || p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const totalRentalIncome = rentals.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + r.total_price, 0);
    const totalPending = payments.filter(p => p.status === 'pending').length + rentals.filter(r => r.status === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Cobros</h3>
                    <p className="text-sm text-muted-foreground mt-1">Control financiero centralizado para citas y alquileres.</p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm">
                    Actualizar Datos
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Ingresos Pacientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">${totalPatientIncome.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total de citas pagadas</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> Ingresos Espacios
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">${totalRentalIncome.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Alquiler de consultorios</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> Cobros Pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{totalPending}</div>
                        <p className="text-xs text-muted-foreground mt-1">Transacciones por verificar</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="patients" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="patients" className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
                        <CreditCard className="mr-2 h-4 w-4" /> Pagos de Pacientes
                    </TabsTrigger>
                    <TabsTrigger value="doctors" className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
                        <Building2 className="mr-2 h-4 w-4" /> Cobros a Médicos (Alquileres)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="patients" className="mt-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg">Transacciones de Citas</CardTitle>
                                    <CardDescription>Historial detallado de pagos de pacientes.</CardDescription>
                                </div>
                                <Badge variant="secondary">{payments.length} Registros</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Paciente</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Monto</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <div className="flex items-center justify-center text-muted-foreground">
                                                    <Clock className="mr-2 h-4 w-4 animate-spin" /> Cargando datos...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No hay pagos registrados</TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map((payment) => (
                                            <TableRow key={payment.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-700">
                                                    {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            P
                                                        </div>
                                                        {payment.appointments?.patient_profiles?.profiles?.full_name || 'Desconocido'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-500">{getMethodLabel(payment.payment_method)}</TableCell>
                                                <TableCell className="font-bold text-slate-800">
                                                    ${payment.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(payment.status)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-200">
                                                                <span className="sr-only">Abrir menú</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(payment.id, 'payments', 'paid')}>
                                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar Pagado
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(payment.id, 'payments', 'pending')}>
                                                                <Clock className="mr-2 h-4 w-4" /> Marcar Pendiente
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600" onClick={() => handleUpdateStatus(payment.id, 'payments', 'cancelled')}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Cancelar Pago
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="doctors" className="mt-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg">Cobros de Alquiler de Espacios</CardTitle>
                                    <CardDescription>Pagos de médicos por uso de consultorios.</CardDescription>
                                </div>
                                <Badge variant="secondary">{rentals.length} Registros</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Fecha Uso</TableHead>
                                        <TableHead>Médico / Profesional</TableHead>
                                        <TableHead>Espacio</TableHead>
                                        <TableHead>Monto Total</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <div className="flex items-center justify-center text-muted-foreground">
                                                    <Clock className="mr-2 h-4 w-4 animate-spin" /> Cargando datos...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : rentals.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No hay registros de alquileres</TableCell>
                                        </TableRow>
                                    ) : (
                                        rentals.map((rental) => (
                                            <TableRow key={rental.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-700">
                                                    {format(new Date(rental.start_time), "dd/MM/yyyy HH:mm", { locale: es })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                                            Dr
                                                        </div>
                                                        {rental.renter_name || 'Desconocido'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        {rental.rooms?.name || '---'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-800">
                                                    ${rental.total_price.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(rental.status)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-200">
                                                                <span className="sr-only">Abrir menú</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(rental.id, 'room_rentals', 'confirmed')}>
                                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Pago
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(rental.id, 'room_rentals', 'pending')}>
                                                                <Clock className="mr-2 h-4 w-4" /> Marcar Pendiente
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600" onClick={() => handleUpdateStatus(rental.id, 'room_rentals', 'cancelled')}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Cancelar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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
