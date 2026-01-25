import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, User, Activity, CalendarDays, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PatientDetailsSidebarProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string | null;
}

export const PatientDetailsSidebar = ({ open, onOpenChange, patientId }: PatientDetailsSidebarProps) => {
    const { user } = useAuth();
    const [patientData, setPatientData] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && patientId) {
            fetchPatientDetails();
        }
    }, [open, patientId]);

    const fetchPatientDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch Basic Info
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', patientId)
                .single();

            setPatientData(profile);

            // 2. Fetch Payments (related to this doctor/patient)
            // We need to join with appointments to filter by doctor if needed, but for now let's just show patient's payments
            // Assuming we want to show payments specifically relevant to the logged-in doctor if possible,
            // but the request implies "Gestion de pagos" for that patient. 
            // Let's interpret "Gestion de Pacientes" sidebar as a comprehensive view.

            const { data: paymentData } = await supabase
                .from('payments')
                .select(`
                    *,
                    appointments (
                        doctor_id,
                        service_type
                    )
                `)
                .eq('appointments.patient_id', patientId) // Filter by appointments for this patient
                .order('payment_date', { ascending: false });

            // Client-side filter to ensure we actullay get the payments for this patient (Supabase filtering on joined table helps but double check)
            // Note: The above query structure might return null for appointments if inner join not met, but use !inner to force.
            // Simplified approach: Get appointments for this patient and doctor, then get payments for those appointments.

            // Re-strategy: Get appointments for this Patient + Doctor
            const { data: doctorProfile } = await supabase.from('doctor_profiles').select('id').eq('user_id', user?.id).single();

            if (doctorProfile) {
                const { data: apts } = await supabase
                    .from('appointments')
                    .select(`
                        *,
                        payments (*)
                    `)
                    .eq('doctor_id', doctorProfile.id)
                    .eq('patient_id', patientId)
                    .order('start_time', { ascending: false });

                setAppointments(apts || []);

                const relatedPayments = apts?.flatMap(a => a.payments) || [];
                setPayments(relatedPayments);
            }

        } catch (error) {
            console.error("Error fetching patient details:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Gestión del Paciente</SheetTitle>
                    <SheetDescription>Detalles, historial y pagos</SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : patientData ? (
                    <div className="space-y-6">
                        {/* Header Profile */}
                        <div className="flex items-center gap-4 pb-6 border-b">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={patientData.avatar_url} />
                                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                    {patientData.full_name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="text-xl font-bold">{patientData.full_name}</h3>
                                <p className="text-sm text-muted-foreground">{patientData.email}</p>
                                <Badge variant="outline" className="mt-2 text-primary border-primary/20">
                                    Paciente Activo
                                </Badge>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <Activity className="h-5 w-5 text-blue-500 mb-2" />
                                    <span className="text-2xl font-bold">{appointments.length}</span>
                                    <span className="text-xs text-muted-foreground">Citas Totales</span>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <DollarSign className="h-5 w-5 text-green-500 mb-2" />
                                    <span className="text-2xl font-bold">
                                        {payments.filter(p => p.status === 'pending').length}
                                    </span>
                                    <span className="text-xs text-muted-foreground">Pagos Pendientes</span>
                                </CardContent>
                            </Card>
                        </div>

                        <Tabs defaultValue="payments" className="w-full">
                            <TabsList className="w-full grid grid-cols-2">
                                <TabsTrigger value="payments">Pagos</TabsTrigger>
                                <TabsTrigger value="history">Historial Citas</TabsTrigger>
                            </TabsList>

                            <TabsContent value="payments" className="mt-4 space-y-4">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" /> Historial de Pagos
                                </h4>
                                {payments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No hay pagos registrados.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {payments.map((pay: any) => (
                                            <div key={pay.id} className="flex justify-between items-center p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                                <div>
                                                    <p className="font-medium text-sm">{formatCurrency(pay.amount)}</p>
                                                    <p className="text-xs text-muted-foreground">{format(new Date(pay.payment_date), "d MMM yyyy", { locale: es })}</p>
                                                </div>
                                                <Badge
                                                    className={
                                                        pay.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                                            pay.status === 'pending' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                                                                'bg-red-100 text-red-700 hover:bg-red-100'
                                                    }
                                                >
                                                    {pay.status === 'completed' ? 'Pagado' : pay.status === 'pending' ? 'Pendiente' : 'Fallido'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="mt-4 space-y-4">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" /> Historial Clínico
                                </h4>
                                <ScrollArea className="h-[300px]">
                                    <div className="space-y-4">
                                        {appointments.map((apt: any) => (
                                            <div key={apt.id} className="relative pl-4 border-l-2 border-muted pb-4 last:pb-0">
                                                <div className="absolute top-0 left-[-5px] w-2 h-2 rounded-full bg-primary" />
                                                <p className="font-medium text-sm">{format(new Date(apt.start_time), "d 'de' MMMM, yyyy", { locale: es })}</p>
                                                <p className="text-xs text-muted-foreground mb-1">
                                                    {format(new Date(apt.start_time), "HH:mm")} - {apt.is_virtual ? 'Virtual' : 'Presencial'}
                                                </p>
                                                <p className="text-sm bg-muted/50 p-2 rounded text-muted-foreground italic">
                                                    "{apt.notes || 'Sin notas adicionales'}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>

                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        No se encontró información del paciente.
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};
