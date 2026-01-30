
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePayments } from '@/hooks/usePayments';
import { useAppointments } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, CreditCard, CheckCircle, Calendar, User, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientPayment() {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();
    const { markAsPaid, loading: processingPayment } = usePayments();
    const { assignRoomToAppointment, generatePayout } = useAppointments();

    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [amount, setAmount] = useState<number>(0);

    useEffect(() => {
        if (!appointmentId) return;

        const fetchAppointment = async () => {
            try {
                const { data: apt, error: aptError } = await supabase
                    .from('appointments')
                    .select('id, start_time, doctor_id, is_virtual')
                    .eq('id', appointmentId)
                    .single();

                if (aptError) throw aptError;

                let doctorName = 'Doctor';
                let consultationFee = 0;

                if (apt.doctor_id) {
                    const { data: docData } = await supabase
                        .from('doctor_profiles')
                        .select('user_id, consultation_fee, consultation_fee_virtual')
                        .eq('id', apt.doctor_id)
                        .single();

                    const docProfile: any = docData;

                    if (docProfile) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('user_id', docProfile.user_id)
                            .single();

                        if (profile) doctorName = profile.full_name;

                        if (apt.is_virtual) {
                            consultationFee = docProfile.consultation_fee_virtual || docProfile.consultation_fee || 0;
                        } else {
                            consultationFee = docProfile.consultation_fee || 0;
                        }
                    }
                }

                setAppointment({
                    ...apt,
                    doctor_profiles: {
                        profiles: {
                            full_name: doctorName
                        }
                    }
                });
                setAmount(consultationFee);

            } catch (error) {
                console.error('Error fetching appointment:', error);
                toast.error('No se pudo cargar la información de la cita');
            } finally {
                setLoading(false);
            }
        };

        fetchAppointment();
    }, [appointmentId]);

    const handlePayment = async () => {
        if (!appointmentId || !appointment) return;

        const success = await markAsPaid(
            appointmentId,
            'card',
            amount,
            'Pago en línea'
        );

        if (success) {
            try {
                if (!appointment.is_virtual && assignRoomToAppointment) {
                    await assignRoomToAppointment(appointmentId, appointment.doctor_id);
                }
                if (generatePayout) {
                    await generatePayout(appointmentId);
                }
            } catch (postError) {
                console.error('Error in post-payment processing:', postError);
            }

            setTimeout(() => {
                setPaymentSuccess(true);
            }, 500);
        }
    };

    const formatCOP = (amount: number) => {
        return `$${amount.toLocaleString('es-CO')} COP`;
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <p className="text-slate-500 font-medium">No se encontró la información de la cita.</p>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
                <Card className="w-full max-w-md border-none shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-center text-white">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <CheckCircle className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">¡Pago Exitoso!</h2>
                        <p className="text-teal-50 text-lg opacity-90">
                            Tu cita ha sido confirmada correctamente.
                        </p>
                    </div>
                    <CardContent className="p-8 text-center space-y-6">
                        <p className="text-slate-500">
                            Hemos enviado un comprobante a tu correo electrónico.
                        </p>
                        <Button
                            onClick={() => navigate('/dashboard')}
                            className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-8 h-12 w-full text-lg shadow-lg shadow-teal-500/20"
                        >
                            Volver al Inicio
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl border-none shadow-xl overflow-hidden animate-in fade-in duration-500">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-8 text-white">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <CreditCard className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Confirmación de Pago</h2>
                            <p className="text-teal-50 text-sm opacity-90">Completa el pago para confirmar tu cita.</p>
                        </div>
                    </div>
                </div>

                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Left Column: Summary */}
                        <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Resumen de la Cita</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center group text-slate-700">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-5 w-5 text-teal-500" />
                                        <span className="font-medium text-slate-600">Fecha</span>
                                    </div>
                                    <span className="font-bold capitalize">
                                        {format(new Date(appointment.start_time), "EEEE d 'de' MMMM", { locale: es })}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center group text-slate-700">
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-5 w-5 text-teal-500" />
                                        <span className="font-medium text-slate-600">Hora</span>
                                    </div>
                                    <span className="font-bold">
                                        {format(new Date(appointment.start_time), "h:mm a")}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center group text-slate-700">
                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-teal-500" />
                                        <span className="font-medium text-slate-600">Especialista</span>
                                    </div>
                                    <span className="font-bold text-right">
                                        {appointment.doctor_profiles?.profiles?.full_name || 'Doctor'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center group text-slate-700">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-teal-500" />
                                        <span className="font-medium text-slate-600">Modalidad</span>
                                    </div>
                                    <span className="font-bold">
                                        {appointment.is_virtual ? 'Virtual (Online)' : 'Presencial'}
                                    </span>
                                </div>
                            </div>

                            <div className="h-px bg-slate-200" />

                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Total a pagar</span>
                                <span className="text-2xl font-black text-teal-700">
                                    {formatCOP(amount)}
                                </span>
                            </div>
                        </div>

                        {/* Right Column: Action */}
                        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Reserva Inmediata</h3>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                                Al confirmar, tu cita quedará agendada automáticamente en el calendario del especialista.
                            </p>

                            <Button
                                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-2xl shadow-xl shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mb-4"
                                onClick={handlePayment}
                                disabled={processingPayment}
                            >
                                {processingPayment ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                        Procesando...
                                    </>
                                ) : (
                                    `Pagar ${formatCOP(amount)}`
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
                                onClick={() => navigate(-1)}
                                disabled={processingPayment}
                            >
                                Cancelar y volver
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
