import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DollarSign, Calendar as CalendarIcon, Download, RefreshCw, Loader2, TrendingUp, Users, Building } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Payout {
    id: string;
    appointment_id: string;
    doctor_id: string;
    consultation_fee: number;
    room_rental_cost: number;
    doctor_payout: number;
    clinic_revenue: number;
    platform_commission: number;
    status: 'pending' | 'processed' | 'failed' | 'cancelled';
    processing_date: string;
    week_start_date: string;
    payment_reference: string | null;
}

export const AdminPayoutsDashboard = () => {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [summary, setSummary] = useState({
        totalDoctorPayouts: 0,
        totalClinicRevenue: 0,
        totalPlatformCommission: 0,
        payoutCount: 0
    });

    const loadPayouts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payouts')
                .select('*')
                .order('processing_date', { ascending: false })
                .limit(100);

            if (error) throw error;

            setPayouts((data as Payout[]) || []);
            calculateSummary(data as Payout[]);
        } catch (error: any) {
            console.error('Error loading payouts:', error);
            toast.error('Error al cargar los pagos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPayouts();
    }, []);

    const calculateSummary = (data: Payout[]) => {
        const totals = data.reduce((acc, payout) => ({
            totalDoctorPayouts: acc.totalDoctorPayouts + Number(payout.doctor_payout),
            totalClinicRevenue: acc.totalClinicRevenue + Number(payout.clinic_revenue),
            totalPlatformCommission: acc.totalPlatformCommission + Number(payout.platform_commission),
            payoutCount: acc.payoutCount + 1
        }), {
            totalDoctorPayouts: 0,
            totalClinicRevenue: 0,
            totalPlatformCommission: 0,
            payoutCount: 0
        });

        setSummary(totals);
    };

    const processWeeklyPayouts = async () => {
        setProcessing(true);
        try {
            const weekStart = format(selectedDate, 'yyyy-MM-dd');

            const { data: session } = await supabase.auth.getSession();
            if (!session.session) {
                toast.error('No estás autenticado');
                return;
            }

            const { data, error } = await supabase.functions.invoke('weekly_payout_processor', {
                body: { week_start: weekStart }
            });

            if (error) throw error;

            toast.success(`Pagos procesados: ${data.summary.payouts_created} registros creados`);
            loadPayouts();
        } catch (error: any) {
            console.error('Error processing payouts:', error);
            toast.error('Error al procesar pagos: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'processed':
                return <Badge className="bg-green-500">Procesado</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500">Pendiente</Badge>;
            case 'failed':
                return <Badge variant="destructive">Fallido</Badge>;
            case 'cancelled':
                return <Badge variant="outline">Cancelado</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const exportToCSV = () => {
        const headers = ['Fecha', 'Status', 'Médico', 'Consulta', 'Alquiler', 'Pago Médico', 'Revenue Clínica', 'Comisión'];
        const rows = payouts.map(p => [
            format(new Date(p.processing_date), 'yyyy-MM-dd'),
            p.status,
            p.doctor_id,
            p.consultation_fee,
            p.room_rental_cost,
            p.doctor_payout,
            p.clinic_revenue,
            p.platform_commission
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payouts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        toast.success('CSV exportado');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gestión de Pagos</h2>
                    <p className="text-sm text-slate-600">Dispersión semanal de pagos a médicos</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadPayouts} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Actualizar
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV} disabled={payouts.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Pagos a Médicos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <span className="text-2xl font-bold text-green-600">
                                ${summary.totalDoctorPayouts.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Revenue Clínica (Alquileres)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-600" />
                            <span className="text-2xl font-bold text-blue-600">
                                ${summary.totalClinicRevenue.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Comisión Plataforma</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                            <span className="text-2xl font-bold text-purple-600">
                                ${summary.totalPlatformCommission.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Registros</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-orange-600" />
                            <span className="text-2xl font-bold text-orange-600">
                                {summary.payoutCount}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Process Weekly Payouts */}
            <Card>
                <CardHeader>
                    <CardTitle>Procesar Pagos Semanales</CardTitle>
                    <CardDescription>Selecciona el inicio de la semana para calcular pagos</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedDate, "PPP", { locale: es })}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(startOfWeek(date, { weekStartsOn: 1 }))}
                                disabled={(date) => date > new Date()}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={processWeeklyPayouts} disabled={processing}>
                        {processing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Calcular Pagos
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Payouts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Pagos</CardTitle>
                    <CardDescription>Registro detallado de todos los pagos procesados</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    ) : payouts.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No hay pagos registrados. Procesa la semana para generar pagos.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Consulta</TableHead>
                                    <TableHead className="text-right">Alquiler</TableHead>
                                    <TableHead className="text-right">Pago Médico</TableHead>
                                    <TableHead className="text-right">Revenue Clínica</TableHead>
                                    <TableHead className="text-right">Comisión</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payouts.map((payout) => (
                                    <TableRow key={payout.id}>
                                        <TableCell className="font-mono text-sm">
                                            {format(new Date(payout.processing_date), 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            ${Number(payout.consultation_fee).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm text-red-600">
                                            -${Number(payout.room_rental_cost).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-green-600">
                                            ${Number(payout.doctor_payout).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-blue-600">
                                            ${Number(payout.clinic_revenue).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm text-purple-600">
                                            ${Number(payout.platform_commission).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
