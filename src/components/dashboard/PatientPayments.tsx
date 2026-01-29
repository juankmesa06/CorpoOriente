import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Receipt, CheckCircle2, FileText, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const PatientPayments = () => {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (!user) return;

            setLoading(true);
            try {
                // 1. Get patient profile
                const { data: patientProfile } = await supabase
                    .from('patient_profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                let allInvoices: any[] = [];

                // --- FETCH APPOINTMENTS ---
                if (patientProfile) {
                    const { data: aptData, error: aptError } = await supabase
                        .from('appointments')
                        .select('id, start_time, status, doctor_id')
                        .eq('patient_id', patientProfile.id)
                        .in('status', ['confirmed', 'completed'])
                        .order('start_time', { ascending: false });

                    if (!aptError && aptData) {
                        const appointments = aptData;
                        const doctorIds = [...new Set(appointments.map(a => a.doctor_id))];

                        // Fetch Doctors
                        const { data: doctorsData } = await supabase
                            .from('doctor_profiles')
                            .select('id, user_id, consultation_fee')
                            .in('id', doctorIds);

                        const doctorMap = new Map((doctorsData || []).map(d => [d.id, d]));
                        const doctorUserIds = (doctorsData || []).map(d => d.user_id);

                        // Fetch User Profiles (Names)
                        const { data: profilesData } = await supabase
                            .from('profiles')
                            .select('user_id, full_name')
                            .in('user_id', doctorUserIds);

                        const nameMap = new Map((profilesData || []).map(p => [p.user_id, p.full_name]));

                        // Fetch explicit payments for appointments
                        const { data: paymentsData } = await supabase
                            .from('payments')
                            .select('id, amount, status, created_at, appointment_id')
                            .in('appointment_id', appointments.map(a => a.id))
                            .eq('status', 'paid');

                        const paymentsMap = new Map((paymentsData || []).map(p => [p.appointment_id, p]));

                        const appointmentInvoices = appointments.map(appt => {
                            const paymentRec = paymentsMap.get(appt.id);
                            const docProfile = doctorMap.get(appt.doctor_id);
                            const docName = docProfile ? nameMap.get(docProfile.user_id) : 'Especialista';
                            const docFee = docProfile?.consultation_fee || 0;

                            return {
                                id: paymentRec ? paymentRec.id : appt.id,
                                referenceId: appt.id,
                                title: `Dr/a. ${docName || 'Especialista'}`,
                                subtitle: 'Consulta Médica',
                                date: appt.start_time,
                                amount: paymentRec ? paymentRec.amount : docFee,
                                status: paymentRec ? 'PAID_RECORD' : 'IMPLIED',
                                type: 'appointment'
                            };
                        });
                        allInvoices = [...allInvoices, ...appointmentInvoices];
                    }
                }

                // --- FETCH ROOM RENTALS ---
                // We need to fetch rentals where the user_id is the current user's id
                const { data: rentalData, error: rentalError } = await supabase
                    .from('room_rentals' as any)
                    .select('*') // listing all fields to be safe, filtering below
                    .eq('user_id', user.id)
                    .eq('status', 'confirmed'); // Only confirmed/paid rentals

                if (!rentalError && rentalData) {
                    // Fetch Room Details
                    const roomIds = [...new Set(rentalData.map((r: any) => r.room_id))];
                    const { data: roomsData } = await supabase
                        .from('rooms' as any)
                        .select('id, name, room_type')
                        .in('id', roomIds);

                    const roomMap = new Map((roomsData as any[] || []).map(r => [r.id, r]));

                    const rentalInvoices = rentalData.map((rental: any) => {
                        const room = roomMap.get(rental.room_id) as any;
                        return {
                            id: rental.id,
                            referenceId: rental.id,
                            title: room ? room.name : 'Espacio Reservado',
                            subtitle: 'Alquiler de Espacio',
                            date: rental.start_time,
                            amount: rental.total_price,
                            status: 'PAID_RECORD', // Rentals are prepaid in this flow
                            type: 'rental'
                        };
                    });
                    allInvoices = [...allInvoices, ...rentalInvoices];
                }

                // Sort by date descending
                allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                setInvoices(allInvoices);

            } catch (error) {
                console.error('Error fetching invoices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [user]);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handleDownload = (id: string) => {
        toast.success("Descargando factura...", { description: "Tu comprobante se está generando." });
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
            </div>
        );
    }

    if (invoices.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Sin pagos registrados</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        Tus recibos de citas y reservas aparecerán aquí automáticamente.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-6 pt-6">
                <div className="flex items-center gap-3">
                    <div className="bg-teal-100 p-2 rounded-xl text-teal-700">
                        <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-slate-800">Mis Facturas</CardTitle>
                        <CardDescription className="text-slate-500">Historial de pagos y comprobantes</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {invoices.map((invoice) => (
                        <div key={invoice.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors group gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm ${invoice.type === 'rental' ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600'}`}>
                                    {invoice.type === 'rental' ? (
                                        <FileText className="h-6 w-6" /> // or Building icon if imported
                                    ) : (
                                        <Calendar className="h-6 w-6" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-base">
                                        {invoice.title}
                                    </p>
                                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                        {invoice.subtitle}
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        {format(new Date(invoice.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0">
                                <div className="text-right">
                                    <p className="font-black text-slate-900 text-lg">{formatPrice(invoice.amount)}</p>
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold justify-end bg-emerald-50 px-2 py-0.5 rounded-md w-fit ml-auto">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>PAGADO</span>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-xl border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50"
                                    onClick={() => handleDownload(invoice.id)}
                                >
                                    <Download className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card >
    );
};
