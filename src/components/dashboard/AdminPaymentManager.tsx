import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    DollarSign, CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown,
    CreditCard, Building2, MoreHorizontal, Trash2, Ban, Calendar,
    Wallet, PieChart, BarChart3, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
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
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export const AdminPaymentManager = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [rentals, setRentals] = useState<RentalPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

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
            .order('start_time', { ascending: false });

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

    // Advanced Statistics Calculations
    const statistics = useMemo(() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const last30Days = subDays(now, 30);

        // Filter completed payments
        const completedPayments = payments.filter(p => p.status === 'paid' || p.status === 'completed');
        const completedRentals = rentals.filter(r => r.status === 'confirmed');

        // Today's revenue
        const todayPayments = completedPayments.filter(p =>
            isWithinInterval(parseISO(p.payment_date), { start: todayStart, end: todayEnd })
        );
        const todayRentals = completedRentals.filter(r =>
            isWithinInterval(parseISO(r.start_time), { start: todayStart, end: todayEnd })
        );
        const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0) +
            todayRentals.reduce((sum, r) => sum + r.total_price, 0);

        // This month's revenue
        const monthPayments = completedPayments.filter(p =>
            isWithinInterval(parseISO(p.payment_date), { start: monthStart, end: monthEnd })
        );
        const monthRentals = completedRentals.filter(r =>
            isWithinInterval(parseISO(r.start_time), { start: monthStart, end: monthEnd })
        );
        const monthTotal = monthPayments.reduce((sum, p) => sum + p.amount, 0) +
            monthRentals.reduce((sum, r) => sum + r.total_price, 0);

        // Payment method breakdown
        const methodBreakdown = completedPayments.reduce((acc, p) => {
            const method = p.payment_method || 'other';
            acc[method] = (acc[method] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);

        // Daily revenue for last 30 days
        const dailyRevenue = [];
        for (let i = 29; i >= 0; i--) {
            const day = subDays(now, i);
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);

            const dayPayments = completedPayments.filter(p =>
                isWithinInterval(parseISO(p.payment_date), { start: dayStart, end: dayEnd })
            );
            const dayRentals = completedRentals.filter(r =>
                isWithinInterval(parseISO(r.start_time), { start: dayStart, end: dayEnd })
            );

            const paymentsTotal = dayPayments.reduce((sum, p) => sum + p.amount, 0);
            const rentalsTotal = dayRentals.reduce((sum, r) => sum + r.total_price, 0);

            dailyRevenue.push({
                date: format(day, 'dd/MM', { locale: es }),
                pacientes: paymentsTotal,
                alquileres: rentalsTotal,
                total: paymentsTotal + rentalsTotal
            });
        }

        // Pending amounts
        const pendingPayments = payments.filter(p => p.status === 'pending');
        const pendingRentals = rentals.filter(r => r.status === 'pending');
        const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0) +
            pendingRentals.reduce((sum, r) => sum + r.total_price, 0);

        return {
            todayTotal,
            monthTotal,
            methodBreakdown,
            dailyRevenue,
            pendingTotal,
            pendingCount: pendingPayments.length + pendingRentals.length,
            totalPatientIncome: completedPayments.reduce((sum, p) => sum + p.amount, 0),
            totalRentalIncome: completedRentals.reduce((sum, r) => sum + r.total_price, 0),
            monthPaymentsCount: monthPayments.length,
            monthRentalsCount: monthRentals.length
        };
    }, [payments, rentals]);

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Efectivo';
            case 'card': return 'Tarjeta';
            case 'transfer': return 'Transferencia';
            default: return method || 'Otro';
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

    // Prepare pie chart data
    const pieChartData = Object.entries(statistics.methodBreakdown).map(([method, amount]) => ({
        name: getMethodLabel(method),
        value: amount
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Gestión de Cobros
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Panel de control financiero con estadísticas avanzadas</p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm" className="shadow-sm">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Actualizar Datos
                </Button>
            </div>

            {/* Main KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Revenue */}
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-50 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Ingresos Hoy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${statistics.todayTotal.toLocaleString()}</div>
                        <p className="text-xs text-emerald-100 mt-1 flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            Acumulado del día
                        </p>
                    </CardContent>
                </Card>

                {/* Month's Revenue */}
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-50 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Ingresos del Mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${statistics.monthTotal.toLocaleString()}</div>
                        <p className="text-xs text-blue-100 mt-1">
                            {statistics.monthPaymentsCount} citas + {statistics.monthRentalsCount} alquileres
                        </p>
                    </CardContent>
                </Card>

                {/* Pending Payments */}
                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-50 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> Cobros Pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${statistics.pendingTotal.toLocaleString()}</div>
                        <p className="text-xs text-amber-100 mt-1">
                            {statistics.pendingCount} transacciones por verificar
                        </p>
                    </CardContent>
                </Card>

                {/* Total Income */}
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-50 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Ingresos Totales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            ${(statistics.totalPatientIncome + statistics.totalRentalIncome).toLocaleString()}
                        </div>
                        <p className="text-xs text-purple-100 mt-1">Histórico completo</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-green-600" /> Ingresos por Pacientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">${statistics.totalPatientIncome.toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground mt-1">Total de citas pagadas</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-600" /> Ingresos por Alquileres
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">${statistics.totalRentalIncome.toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground mt-1">Alquiler de consultorios</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Revenue Chart */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Ingresos Diarios (Últimos 30 Días)
                        </CardTitle>
                        <CardDescription>Comparativa de ingresos por pacientes y alquileres</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statistics.dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="colorAlquileres" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                        }}
                                        formatter={(value: any) => `$${value.toLocaleString()}`}
                                    />
                                    <Area type="monotone" dataKey="pacientes" name="Pacientes" stroke="#10b981" fillOpacity={1} fill="url(#colorPacientes)" />
                                    <Area type="monotone" dataKey="alquileres" name="Alquileres" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAlquileres)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Methods Pie Chart */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PieChart className="h-5 w-5 text-purple-600" />
                            Métodos de Pago
                        </CardTitle>
                        <CardDescription>Distribución por método</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Detailed Tables */}
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
                        <BarChart3 className="mr-2 h-4 w-4" /> Resumen
                    </TabsTrigger>
                    <TabsTrigger value="patients" className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
                        <CreditCard className="mr-2 h-4 w-4" /> Pagos de Pacientes
                    </TabsTrigger>
                    <TabsTrigger value="doctors" className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
                        <Building2 className="mr-2 h-4 w-4" /> Cobros a Médicos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                            <CardTitle className="text-xl">Resumen Financiero</CardTitle>
                            <CardDescription>Vista general de todas las transacciones</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100">
                                    <div className="text-sm font-medium text-green-700 mb-2">Ingresos del Día</div>
                                    <div className="text-3xl font-bold text-slate-900">${statistics.todayTotal.toLocaleString()}</div>
                                </div>
                                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100">
                                    <div className="text-sm font-medium text-blue-700 mb-2">Ingresos del Mes</div>
                                    <div className="text-3xl font-bold text-slate-900">${statistics.monthTotal.toLocaleString()}</div>
                                </div>
                                <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-white rounded-lg border border-amber-100">
                                    <div className="text-sm font-medium text-amber-700 mb-2">Pendientes</div>
                                    <div className="text-3xl font-bold text-slate-900">${statistics.pendingTotal.toLocaleString()}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="patients" className="mt-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg">Transacciones de Citas</CardTitle>
                                    <CardDescription>Historial detallado de pagos de pacientes</CardDescription>
                                </div>
                                <Badge variant="secondary" className="text-sm">{payments.length} Registros</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white z-10">
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
                                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                    No hay pagos registrados
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            payments.slice(0, 100).map((payment) => (
                                                <TableRow key={payment.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="font-medium text-slate-700">
                                                        {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-xs font-bold text-green-700">
                                                                {payment.appointments?.patient_profiles?.profiles?.full_name?.charAt(0) || 'P'}
                                                            </div>
                                                            <span className="font-medium">
                                                                {payment.appointments?.patient_profiles?.profiles?.full_name || 'Desconocido'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        {getMethodLabel(payment.payment_method)}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-slate-900">
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
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="doctors" className="mt-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg">Cobros de Alquiler de Espacios</CardTitle>
                                    <CardDescription>Pagos de médicos por uso de consultorios</CardDescription>
                                </div>
                                <Badge variant="secondary" className="text-sm">{rentals.length} Registros</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white z-10">
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
                                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                    No hay registros de alquileres
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rentals.slice(0, 100).map((rental) => (
                                                <TableRow key={rental.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="font-medium text-slate-700">
                                                        {format(new Date(rental.start_time), "dd/MM/yyyy HH:mm", { locale: es })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                                                                {rental.renter_name?.charAt(0) || 'Dr'}
                                                            </div>
                                                            <span className="font-medium">
                                                                {rental.renter_name || 'Desconocido'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        <div className="flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" />
                                                            {rental.rooms?.name || '---'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-slate-900">
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
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
