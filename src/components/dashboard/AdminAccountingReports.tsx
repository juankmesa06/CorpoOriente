import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Wallet, CalendarDays, ArrowUpRight, ArrowDownRight, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Mock Data - Monthly
const monthlyData = [
    { name: 'Ene', income: 4000, expenses: 2400 },
    { name: 'Feb', income: 3000, expenses: 1398 },
    { name: 'Mar', income: 2000, expenses: 9800 },
    { name: 'Abr', income: 2780, expenses: 3908 },
    { name: 'May', income: 1890, expenses: 4800 },
    { name: 'Jun', income: 2390, expenses: 3800 },
];

// Mock Data - Daily (Last 14 days)
const dailyData = Array.from({ length: 14 }, (_, i) => ({
    name: `Día ${i + 1}`,
    amount: Math.floor(Math.random() * 500) + 100,
}));

// Mock Transactions
const transactions = [
    { id: 'TRX-9821', date: '2024-05-20', concept: 'Consulta General - Dr. Pérez', type: 'income', amount: 150.00, status: 'completed' },
    { id: 'TRX-9822', date: '2024-05-20', concept: 'Alquiler Consultorio 3', type: 'income', amount: 300.00, status: 'completed' },
    { id: 'TRX-9823', date: '2024-05-19', concept: 'Terapia de Pareja', type: 'income', amount: 200.00, status: 'pending' },
];

export const AdminAccountingReports = () => {
    const [view, setView] = useState("monthly");
    const [totalRevenue, setTotalRevenue] = useState(0);

    useEffect(() => {
        const fetchRevenue = async () => {
            const { data } = await supabase
                .from('payments')
                .select('amount')
                .eq('status', 'paid');

            const total = data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
            setTotalRevenue(total);
        };
        fetchRevenue();
    }, []);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);

    return (
        <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Modo de Demostración</AlertTitle>
                <AlertDescription className="text-blue-700">
                    Los gráficos y transacciones de abajo son ejemplos visuales. La tarjeta de <strong>Ingresos Totales (Pagados)</strong> sí muestra el dato real de la base de datos (Suma de pagos con estado <em>Paid</em>).
                </AlertDescription>
            </Alert>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Total */}
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-slate-500">Ingresos Totales (Pagados)</p>
                            <div className="bg-green-100 p-2 rounded-full">
                                <DollarSign className="h-4 w-4 text-green-700" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</div>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-slate-500">Acumulado total histórico</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Card 2: Appointments Income */}
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-slate-500">Ingresos por Citas</p>
                            <div className="bg-blue-100 p-2 rounded-full">
                                <CreditCard className="h-4 w-4 text-blue-700" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">$8,120.00</div>
                        <p className="text-xs text-slate-500 mt-1">65% del total recolectado</p>
                    </CardContent>
                </Card>

                {/* Card 3: Rentals Income */}
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-slate-500">Ingresos por Alquileres</p>
                            <div className="bg-purple-100 p-2 rounded-full">
                                <Wallet className="h-4 w-4 text-purple-700" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">$4,225.00</div>
                        <p className="text-xs text-slate-500 mt-1">35% del total recolectado</p>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Section */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Análisis Financiero
                            </CardTitle>
                            <CardDescription>Visualización de tendencias de ingresos y flujo de caja.</CardDescription>
                        </div>
                        <Tabs defaultValue="monthly" className="w-[300px]" onValueChange={setView}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="monthly">Mensual</TabsTrigger>
                                <TabsTrigger value="daily">Diaria</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            {view === 'monthly' ? (
                                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="income" name="Ingresos" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            ) : (
                                <AreaChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="amount" name="Ingreso Diario" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorAmount)" />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Transaction Table */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-gray-500" />
                        Detalle de Transacciones Recientes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead>ID Transacción</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((trx) => (
                                <TableRow key={trx.id} className="group hover:bg-slate-50/50">
                                    <TableCell className="font-mono text-xs text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-3 w-3" />
                                            {trx.id}
                                        </div>
                                    </TableCell>
                                    <TableCell>{trx.date}</TableCell>
                                    <TableCell className="font-medium text-slate-700">{trx.concept}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={`${trx.status === 'completed'
                                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                                                }`}
                                        >
                                            {trx.status === 'completed' ? 'Completado' : 'Pendiente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={`text-right font-bold ${trx.type === 'income' ? 'text-slate-900' : 'text-red-600'}`}>
                                        {trx.type === 'expense' ? '-' : '+'}{formatCurrency(trx.amount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
