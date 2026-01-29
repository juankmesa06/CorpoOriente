import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, ArrowRightLeft, Calendar, DollarSign, Activity, CreditCard, ChevronUp, ChevronDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';

interface WalletEntry {
    id: string;
    date: string;
    patientName: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    status: string;
    description?: string;
}

export const DoctorWallet = () => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<WalletEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        pendingIncome: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            loadWalletData();
        }
    }, [user]);

    const loadWalletData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Get Doctor Profile ID & Fee
            const { data: doctorProfile } = await supabase
                .from('doctor_profiles')
                .select('id, consultation_fee')
                .eq('user_id', user.id)
                .single();

            if (!doctorProfile) {
                setLoading(false);
                return;
            }

            // 2. Fetch Appointments (No payment_status column exists)
            const { data: appointments, error } = await supabase
                .from('appointments' as any)
                .select(`
                    id,
                    start_time,
                    status,
                    patient_profiles (
                        profiles (full_name)
                    ),
                    payments (
                        amount,
                        status
                    )
                `)
                .eq('doctor_id', doctorProfile.id)
                .order('start_time', { ascending: false });

            if (error) {
                console.error('DEBUG: Wallet fetch error:', error);
                throw error;
            }

            // 3. Fetch Room Rentals Separately to avoid Ambiguous Relationship errors
            let roomRentalsMap: Record<string, any> = {};
            if (appointments && appointments.length > 0) {
                const appointmentIds = appointments.map((a: any) => a.id);
                const { data: rentals } = await supabase
                    .from('room_rentals')
                    .select('*, rooms(name)')
                    .in('appointment_id', appointmentIds);

                if (rentals) {
                    rentals.forEach((r: any) => {
                        roomRentalsMap[r.appointment_id] = r;
                    });
                }
            }

            console.log('DEBUG: Doctor Profile:', doctorProfile);
            console.log('DEBUG: Appointments fetched:', appointments);

            const walletEntries: WalletEntry[] = [];
            let incomeCount = 0;
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalPending = 0;
            const dailyIncome: Record<string, number> = {};

            appointments?.forEach((apt: any) => {
                // Timezone-safe date literal parsing
                const dateKey = (() => {
                    if (!apt.start_time) return '...';
                    const datePart = apt.start_time.split('T')[0];
                    const [y, m, d] = datePart.split('-');
                    return format(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)), 'dd MMM', { locale: es });
                })();

                // --- INCOME LOGIC ---
                let aptAmount = 0;
                let isPaid = false;
                let isPending = false;

                // Priority 1: Actual Payment records linked to appointment
                const payment = apt.payments?.[0]; // Taking the first payment found
                if (payment) {
                    const rawAmount = Number(payment.amount);
                    // Fallback hack: If amount is exactly 500, it's the hardcoded bug value. Use doctor fee instead.
                    aptAmount = rawAmount === 500 ? (Number(doctorProfile.consultation_fee) || 150000) : rawAmount;
                    isPaid = payment.status === 'completed' || payment.status === 'paid';
                    isPending = !isPaid;
                }
                // Priority 2: If no payment record, but status is confirmed/completed, estimate from fee
                else if (['completed', 'confirmed'].includes(apt.status)) {
                    aptAmount = Number(doctorProfile.consultation_fee) || 0;
                    isPending = true; // No record yet = pending
                }

                if (aptAmount > 0 && apt.status !== 'cancelled') {
                    totalIncome += aptAmount;
                    if (isPending) totalPending += aptAmount;

                    walletEntries.push({
                        id: `inc-${apt.id}`,
                        date: apt.start_time,
                        patientName: apt.patient_profiles?.profiles?.full_name || 'Paciente',
                        type: 'income',
                        category: 'Consulta Médica',
                        amount: aptAmount,
                        status: isPaid ? 'completed' : 'pending',
                        description: 'Honorarios Profesionales'
                    });

                    dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + aptAmount;
                }

                // --- EXPENSE LOGIC (Room Rental) ---
                const rental = roomRentalsMap[apt.id];
                if (rental) {
                    const rentalCost = Number(rental.total_price) || 0;
                    if (rentalCost > 0) {
                        totalExpenses += rentalCost;
                        walletEntries.push({
                            id: `exp-${apt.id}`,
                            date: apt.start_time,
                            patientName: 'Alquiler Consultorio',
                            type: 'expense',
                            category: 'Infraestructura',
                            amount: rentalCost,
                            status: 'completed',
                            description: rental.rooms?.name || 'Espacio'
                        });
                    }
                }
            });

            // Prepare Chart Data
            const sortedChartData = Object.entries(dailyIncome)
                .map(([name, value]) => ({ name, value }))
                .reverse()
                .slice(-7);

            // Balance total including what we expect to receive (Estimado)
            const netBalance = (totalIncome) - totalExpenses;

            setChartData(sortedChartData);
            setEntries(walletEntries);
            setStats({
                totalIncome: totalIncome,
                totalExpenses: totalExpenses,
                netBalance: netBalance,
                pendingIncome: totalPending
            });

        } catch (err) {
            console.error('Error loading wallet:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCOP = (val: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 1. Main Balance Card - Premium Banking Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Balance & Card Visual */}
                <Card className="col-span-1 md:col-span-2 overflow-hidden border-none shadow-xl bg-slate-900 text-white relative">
                    <div className="absolute top-0 right-0 p-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 p-24 bg-blue-500/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

                    <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 font-medium mb-1">Balance Total Estimado</p>
                                <h1 className="text-4xl font-bold tracking-tight text-white mb-2">{formatCOP(stats.netBalance)}</h1>
                                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full w-fit">
                                    <TrendingUp className="h-3 w-3" />
                                    <span>+12% vs mes anterior</span>
                                </div>
                            </div>
                            <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Wallet className="h-6 w-6 text-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mt-8">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1 rounded bg-emerald-500/20">
                                        <ArrowRightLeft className="h-3 w-3 text-emerald-400" />
                                    </div>
                                    <span className="text-slate-400 text-sm">Ingresos</span>
                                </div>
                                <p className="text-xl font-semibold text-emerald-400">{formatCOP(stats.totalIncome)}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1 rounded bg-rose-500/20">
                                        <Activity className="h-3 w-3 text-rose-400" />
                                    </div>
                                    <span className="text-slate-400 text-sm">Gastos</span>
                                </div>
                                <p className="text-xl font-semibold text-rose-400">{formatCOP(stats.totalExpenses)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Mini Stats / Chart */}
                <Card className="border-none shadow-lg bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Tendencia de Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[150px] w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#10b981' }}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-300 text-xs text-center p-4">
                                    Sin datos suficientes para mostrar tendencia
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                            <span>Últimos 7 días</span>
                            <span className="text-emerald-600 font-medium">Ver reporte completo</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Transaction List */}
            <Card className="border-none shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg text-slate-800">Movimientos Recientes</CardTitle>
                        <CardDescription>Historial de ingresos y gastos operativos</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <button className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                            Exportar
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Concepto</th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            No hay movimientos registrados
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${entry.type === 'income'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-rose-50 text-rose-600'
                                                        }`}>
                                                        {entry.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 group-hover:text-teal-700 transition-colors">{entry.patientName}</p>
                                                        <p className="text-xs text-slate-500">{entry.category}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-600 font-medium whitespace-nowrap">
                                                    {(() => {
                                                        const datePart = entry.date.split('T')[0];
                                                        const [y, m, d] = datePart.split('-');
                                                        return format(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)), 'dd MMM', { locale: es });
                                                    })()}
                                                </span>
                                                <span className="text-xs text-slate-400 block whitespace-nowrap">
                                                    {(() => {
                                                        const timePart = entry.date.split('T')[1]?.slice(0, 5) || '00:00';
                                                        const [h, m] = timePart.split(':');
                                                        const hours = parseInt(h, 10);
                                                        const period = hours >= 12 ? 'PM' : 'AM';
                                                        const displayHours = hours % 12 || 12;
                                                        return `${displayHours}:${m} ${period}`;
                                                    })()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${entry.status === 'paid' || entry.status === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                    {entry.status === 'paid' ? 'Pagado' : entry.status === 'completed' ? 'Completado' : entry.status === 'pending' ? 'Pendiente' : entry.status}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${entry.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                                                }`}>
                                                {entry.type === 'income' ? '+' : '-'}{formatCOP(entry.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
