import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
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

        // Obtener citas del doctor con información de pagos (solo las que tienen pagos)
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id,
                start_time,
                patient_profiles!inner(
                    profiles:profiles!inner(full_name)
                ),
                payments!inner(
                    id,
                    amount,
                    payment_date,
                    payment_method,
                    status
                )
            `)
            .eq('doctor_id', doctorProfile.id)
            .order('start_time', { ascending: false })
            .limit(10);

        if (error) {
            toast.error('Error al cargar pagos');
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

        appointments?.forEach((apt: any) => {
            apt.payments?.forEach((payment: any) => {
                const paymentDate = new Date(payment.payment_date);
                const amount = payment.amount || 0;

                paymentList.push({
                    id: payment.id,
                    amount: amount,
                    payment_date: payment.payment_date,
                    payment_method: payment.payment_method,
                    status: payment.status,
                    patient_name: apt.patient_profiles?.profiles?.full_name || 'Paciente'
                });

                totalAmount += amount;

                if (paymentDate >= firstDayOfMonth) {
                    thisMonthAmount += amount;
                }

                if (payment.status === 'pending') {
                    pendingAmount += amount;
                }
            });
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
        return `$${amount.toLocaleString('es-CO')} COP`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
            completed: 'default',
            pending: 'secondary',
            failed: 'destructive'
        };

        const labels: Record<string, string> = {
            completed: 'Completado',
            pending: 'Pendiente',
            failed: 'Fallido'
        };

        return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Historial de Pagos
                </CardTitle>
                <CardDescription>Pagos recibidos de tus pacientes</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Total Recibido</p>
                                </div>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCOP(stats.total)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Este Mes</p>
                                </div>
                                <p className="text-2xl font-bold">
                                    {formatCOP(stats.thisMonth)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Pendiente</p>
                                </div>
                                <p className="text-2xl font-bold text-orange-600">
                                    {formatCOP(stats.pending)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Lista de pagos */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Últimos Pagos</h3>
                        {loading ? (
                            <p className="text-center text-muted-foreground py-8">Cargando pagos...</p>
                        ) : payments.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No hay pagos registrados
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{payment.patient_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(payment.payment_date)} • {payment.payment_method}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-semibold text-green-600">
                                                {formatCOP(payment.amount)}
                                            </p>
                                            {getStatusBadge(payment.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
