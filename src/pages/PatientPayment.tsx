
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePayments } from '@/hooks/usePayments';
import { useAppointments } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientPayment() {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();
    const { markAsPaid, loading: processingPayment } = usePayments();
    const { assignRoomToAppointment, generatePayout } = useAppointments(); // Get new RPCs

    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [amount, setAmount] = useState<number>(0);

    useEffect(() => {
        if (!appointmentId) return;

        const fetchAppointment = async () => {
            try {
                // 1. Fetch basic appointment info + doctor_id + fees
                const { data: apt, error: aptError } = await supabase
                    .from('appointments')
                    .select('id, start_time, doctor_id, is_virtual')
                    .eq('id', appointmentId)
                    .single();

                if (aptError) throw aptError;

                let doctorName = 'Doctor';
                let consultationFee = 0;

                // 2. Fetch Doctor Name and Fees
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

                        // Determine price
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
                setAmount(consultationFee); // Set calculated amount

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

        // 1. Mark as Paid (Core)
        const success = await markAsPaid(
            appointmentId,
            'card',
            amount,
            'Pago en línea'
        );

        if (success) {
            // 2. Post-Payment Actions (Silent orchestration)
            try {
                // A. Assign Room (if physical)
                if (!appointment.is_virtual) {
                    if (assignRoomToAppointment) {
                        const roomAssigned = await assignRoomToAppointment(appointmentId, appointment.doctor_id);
                        if (!roomAssigned) console.warn('Could not assign room immediately. Monitor this.');
                    }
                }

                // B. Generate Payout (Wallet Update)
                if (generatePayout) {
                    await generatePayout(appointmentId);
                }

            } catch (postError) {
                console.error('Error in post-payment processing:', postError);
                // Don't fail the user flow, just log. Admin can fix.
            }

            // Delay state change to avoid React removeChild race condition with Button state
            setTimeout(() => {
                setPaymentSuccess(true);
                setTimeout(() => {
                    navigate('/dashboard');
                }, 3000);
            }, 100);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground"><span>Cita no encontrada.</span></p>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="flex bg-gray-50 h-screen flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-green-700">¡Pago Exitoso!</h2>
                        <p className="text-muted-foreground">
                            Tu cita ha sido confirmada correctamente.
                        </p>
                        <p className="text-sm text-gray-500">
                            Redirigiendo a tu panel principal...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-xl text-center">Resumen de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-white p-4 rounded-lg border space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Fecha:</span>
                            <span className="font-medium">
                                <span>{format(new Date(appointment.start_time), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Hora:</span>
                            <span className="font-medium">
                                <span>{format(new Date(appointment.start_time), "h:mm a")}</span>
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Doctor:</span>
                            <span className="font-medium">
                                <span>{appointment.doctor_profiles?.profiles?.full_name || 'Doctor'}</span>
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Modalidad:</span>
                            <span className="font-medium">
                                <span>{appointment.is_virtual ? 'Virtual' : 'Presencial'}</span>
                            </span>
                        </div>

                        <div className="border-t pt-3 mt-3">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg">Total a pagar:</span>
                                <span className="font-bold text-xl text-primary">
                                    <span>${amount.toLocaleString()} COP</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full h-12 text-lg gap-2"
                        onClick={handlePayment}
                        disabled={processingPayment}
                    >
                        {processingPayment ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <CreditCard className="h-5 w-5" />
                        )}
                        {processingPayment ? 'Procesando...' : 'Pagar Ahora'}
                    </Button>
                </CardFooter>
            </Card >
        </div >
    );
}
