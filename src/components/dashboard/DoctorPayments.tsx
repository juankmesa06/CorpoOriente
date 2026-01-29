import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calendar, CreditCard, Receipt, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    status: string;
    patient_name: string;
}

interface PaymentStats {
    total: number;
    thisMonth: number;
    pending: number;
}

export const DoctorPayments = () => {
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState<PaymentStats>({ total: 0, thisMonth: 0, pending: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadPayments();
        }
    }, [user]);

    const loadPayments = async () => {
        if (!user) return;

        setLoading(true);

        // Obtener perfil del doctor
        const { data: doctorProfile } = await supabase
            .from('doctor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!doctorProfile) {
            setLoading(false);
            return;
        }

        // Obtener historial de 'payouts' (Billetera / Ingresos Netos)
        const { data: payoutsData, error } = await supabase
            .from('payouts')
            .select(`
                id,
                doctor_payout,
                created_at,
                status,
                appointments!inner(
                    start_time,
                    patient_profiles!inner(
                        profiles:profiles!inner(full_name)
                    )
                )
            `)
            .eq('doctor_id', doctorProfile.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error loading payouts:', error);
            toast.error('Error al cargar historial de ingresos');
            setLoading(false);
            return;
        }

        // Procesar pagos
        const paymentList: Payment[] = [];
        let totalAmount = 0;
        let thisMonthAmount = 0;
        let pendingAmount = 0;

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        payoutsData?.forEach((payout: any) => {
            const paymentDate = new Date(payout.created_at);
            const amount = Number(payout.doctor_payout) || 0;

            paymentList.push({
                id: payout.id,
                amount: amount,
                payment_date: payout.created_at,
                payment_method: 'Transferencia', // Payouts are internal/transfer
                status: payout.status,
                patient_name: payout.appointments?.patient_profiles?.profiles?.full_name || 'Paciente'
            });

            totalAmount += amount;

            if (paymentDate >= firstDayOfMonth) {
                thisMonthAmount += amount;
            }

            if (payout.status === 'pending') {
                pendingAmount += amount;
            }
        });

        setPayments(paymentList);
        setStats({
            total: totalAmount,
            thisMonth: thisMonthAmount,
            pending: pendingAmount
        });
        setLoading(false);
    };

    const formatCOP = (amount: number) => {
        return `$${amount.toLocaleString('es-CO')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: any; color: string }> = {
            completed: {
                label: 'Completado',
                variant: 'default',
                icon: CheckCircle2,
                color: 'text-emerald-600'
            },
            pending: {
                label: 'Pendiente',
                variant: 'secondary',
                icon: Clock,
                color: 'text-amber-600'
            },
            failed: {
                label: 'Fallido',
                variant: 'destructive',
                icon: XCircle,
                color: 'text-red-600'
            }
        };

        return configs[status] || configs.pending;
    };

    const getPaymentMethodIcon = (method: string) => {
        const normalized = method?.toLowerCase() || '';
        if (normalized.includes('efectivo') || normalized.includes('cash')) {
            return <DollarSign className="h-4 w-4" />;
        }
        if (normalized.includes('tarjeta') || normalized.includes('card')) {
            return <CreditCard className="h-4 w-4" />;
        }
        return <Receipt className="h-4 w-4" />;
    };

    return (
        <Card className="border-0 shadow-xl bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            Historial de Consultas
                        </h2>
                        <p className="text-teal-50 text-sm">Seguimiento completo de consultas médicas y transacciones de pago.</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-teal-100 font-medium uppercase tracking-wide">Total Recibido</p>
                                <p className="text-2xl font-bold text-white">{formatCOP(stats.total)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-teal-100 font-medium uppercase tracking-wide">Este Mes</p>
                                <p className="text-2xl font-bold text-white">{formatCOP(stats.thisMonth)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-teal-100 font-medium uppercase tracking-wide">Pendiente</p>
                                <p className="text-2xl font-bold text-white">{formatCOP(stats.pending)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CardContent className="p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                        <p className="text-slate-600 font-medium">Cargando datos...</p>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <FileText className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay citas registradas</h3>
                        <p className="text-sm text-slate-500 text-center max-w-md">
                            Los pagos de tus citas aparecerán aquí una vez que los pacientes completen sus consultas.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-slate-50 rounded-t-lg border-b border-slate-200">
                            <div className="col-span-1">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha / Hora</p>
                            </div>
                            <div className="col-span-1">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Paciente</p>
                            </div>
                            <div className="col-span-1">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Método</p>
                            </div>
                            <div className="col-span-1">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Monto</p>
                            </div>
                            <div className="col-span-1">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</p>
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-slate-100">
                            {payments.map((payment, index) => {
                                const statusConfig = getStatusConfig(payment.status);
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <div
                                        key={payment.id}
                                        className="grid grid-cols-6 gap-4 px-4 py-4 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="col-span-1 flex items-center">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-900">
                                                    {new Date(payment.payment_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(payment.payment_date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="col-span-1 flex items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-xs">
                                                    {payment.patient_name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-slate-900 truncate max-w-[150px]">
                                                    {payment.patient_name}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="col-span-1 flex items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                                    {getPaymentMethodIcon(payment.payment_method)}
                                                </div>
                                                <span className="text-sm text-slate-700 capitalize">
                                                    {payment.payment_method}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="col-span-1 flex items-center">
                                            <div className="px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <p className="text-sm font-bold text-emerald-700">
                                                    {formatCOP(payment.amount)}
                                                </p>
                                                <p className="text-xs text-emerald-600">COP</p>
                                            </div>
                                        </div>

                                        <div className="col-span-1 flex items-center">
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${payment.status === 'completed' ? 'bg-emerald-50 border border-emerald-100' :
                                                payment.status === 'pending' ? 'bg-amber-50 border border-amber-100' :
                                                    'bg-red-50 border border-red-100'
                                                }`}>
                                                <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
                                                <span className={`text-sm font-medium ${statusConfig.color}`}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
