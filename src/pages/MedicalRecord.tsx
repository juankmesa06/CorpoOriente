
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PatientNameDisplay } from '@/components/dashboard/PatientNameDisplay';
import { MedicalHistoryTimeline } from '@/components/medical-records/MedicalHistoryTimeline';
import { VitalSignsCard } from '@/components/medical-records/VitalSignsCard';
import { useMedicalRecords, PatientMedicalHistory } from '@/hooks/useMedicalRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, Thermometer, Activity, Pill, AlertCircle, ArrowLeft, HeartPulse, User, Video, Minimize2, ExternalLink, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

import { MedicalEntryForm } from '@/components/medical-records/MedicalEntryForm';
import { CreateEntryInput } from '@/hooks/useMedicalRecords';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MedicalRecord = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('id');
    const appointmentId = searchParams.get('appointment_id');
    const isConsultationMode = searchParams.get('consultation') === 'true';

    const { getPatientHistory, createEntry } = useMedicalRecords();
    const [loading, setLoading] = useState(true);
    const [medicalHistory, setMedicalHistory] = useState<PatientMedicalHistory | null>(null);
    const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [vitalData, setVitalData] = useState<any>({
        blood_type: null,
        allergies: [],
        current_medications: []
    });

    // Video Call State
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [isVideoMinimized, setIsVideoMinimized] = useState(false);

    // Dialog state
    const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
    const [pendingEntryData, setPendingEntryData] = useState<CreateEntryInput | null>(null);

    const handleSaveEntry = async (data: CreateEntryInput, completeAppointment = false) => {
        try {
            // 1. Separate followUpDate from the actual medical entry data
            const { followUpDate, ...cleanEntryData } = data as any;

            // 2. Create the Medical Entry
            await createEntry(cleanEntryData);

            // 3. If completing the appointment...
            if (completeAppointment && appointmentId) {
                // Mark current as completed
                await supabase
                    .from('appointments')
                    .update({ status: 'completed' })
                    .eq('id', appointmentId);

                // Earnings Logic: Fetch payment amount and rental cost
                const { data: apptData } = await supabase
                    .from('appointments')
                    .select(`
                        doctor_id,
                        payments (
                            amount
                        ),
                        room_rentals:rental_id (
                            rental_price
                        )
                    `)
                    .eq('id', appointmentId)
                    .single();

                if (apptData) {
                    const price = Number((apptData as any).payments?.amount) || 0;
                    const rentalData = Array.isArray(apptData.room_rentals) ? apptData.room_rentals[0] : apptData.room_rentals;
                    const rentalCost = Number(rentalData?.rental_price) || 0;
                    const doctorNet = Math.max(0, price - rentalCost);

                    // Insert Payout Record
                    await (supabase.from('payouts' as any) as any).insert([{
                        appointment_id: appointmentId,
                        doctor_id: apptData.doctor_id,
                        amount: price,
                        rental_fee: rentalCost,
                        doctor_payout: doctorNet,
                        status: 'processed'
                    }]);
                }

                // Handle Follow-up Appointment Creation
                if (followUpDate) {
                    const nextStart = new Date(followUpDate);
                    const nextEnd = new Date(nextStart.getTime() + 60 * 60 * 1000); // Default 1 hour

                    // Get the internal doctor_id from profile
                    const { data: dProfile } = await supabase
                        .from('doctor_profiles')
                        .select('id')
                        .eq('user_id', user?.id)
                        .single();

                    const { error: followUpError } = await supabase
                        .from('appointments')
                        .insert([{
                            doctor_id: dProfile?.id,
                            patient_id: patientId,
                            start_time: nextStart.toISOString(),
                            end_time: nextEnd.toISOString(),
                            status: 'pending_payment' as any,
                            notes: 'Sesión de seguimiento generada automáticamente'
                        }]);

                    if (!followUpError) {
                        toast.success("Próxima cita agendada (Pendiente de Pago)");
                    }
                }

                // Notify Patient
                if (patientId) {
                    const { data: pProfile } = await supabase
                        .from('patient_profiles')
                        .select('user_id')
                        .eq('id', patientId)
                        .single();

                    if (pProfile?.user_id) {
                        await supabase
                            .from('notifications' as any)
                            .insert([{
                                user_id: pProfile.user_id,
                                title: 'Sesión Finalizada',
                                message: `El Dr. ${user?.user_metadata?.full_name || 'su terapeuta'} ha finalizado la sesión.`,
                                type: 'success'
                            }]);

                        if (followUpDate) {
                            await supabase
                                .from('notifications' as any)
                                .insert([{
                                    user_id: pProfile.user_id,
                                    title: 'Nueva Cita Pendiente de Pago',
                                    message: `Se ha generado su próxima cita para el ${new Date(followUpDate).toLocaleString()}. Tiene 24 horas para realizar el pago o se liberará el espacio.`,
                                    type: 'warning'
                                }]);
                        }
                    }
                }
            }

            toast.success(completeAppointment ? "Sesión finalizada y procesada" : "Entrada guardada exitosamente");

            // Refresh history
            if (patientId) {
                const updatedHistory = await getPatientHistory(patientId);
                setMedicalHistory(updatedHistory);
            }

            // Exit consultation mode
            if (completeAppointment) {
                navigate(`/medical-record?id=${patientId}`, { replace: true });
            }
        } catch (error: any) {
            console.error("Error creating entry:", error);
            toast.error(error.message || "Error al guardar la consulta");
        }
    };

    useEffect(() => {
        const fetchPatientData = async () => {
            if (!user) return;

            try {
                setLoading(true);
                // 1. Fetch Profile Data (Vital Signs)
                // If patientId is provided (Doctor view), use 'id'. Otherwise (Patient view), use 'user_id'.

                let query = supabase.from('patient_profiles').select('id, blood_type, allergies');

                if (patientId) {
                    query = query.eq('id', patientId);
                } else {
                    query = query.eq('user_id', user.id);
                }

                const { data: profile, error: profileError } = await query.maybeSingle();

                if (profileError) throw profileError;

                if (profile) {
                    setVitalData(prev => ({
                        ...prev,
                        blood_type: profile.blood_type,
                        allergies: profile.allergies || []
                    }));

                    // 2. Fetch History using RPC and upcoming appointments
                    try {
                        // Fetch medical history (RPC)
                        const { data: historyData, error: historyError } = await supabase.rpc('get_patient_medical_history', { _patient_id: profile.id });
                        if (historyError) throw historyError;
                        if (historyData) setMedicalHistory(historyData as any);

                        // Fetch upcoming appointments
                        const { data: appointmentsData, error: apptError } = await supabase
                            .from('appointments')
                            .select('*, doctor_profiles(profiles(full_name, avatar_url))')
                            .eq('patient_id', profile.id)
                            .gte('start_time', new Date().toISOString())
                            .in('status', ['confirmed', 'pending'] as any[])
                            .order('start_time', { ascending: true });

                        if (!apptError && appointmentsData) {
                            setUpcomingAppointments(appointmentsData);
                        }

                        if (!historyData && (!appointmentsData || appointmentsData.length === 0)) {
                            setError("No se encontró información técnica o citas para este paciente.");
                        }
                    } catch (e: any) {
                        console.error("RPC Error:", e);
                        setError(`Error al obtener historial: ${e.message || 'Error desconocido'}`);
                    }

                    // 3. Fetch Medications
                    const { data: medRecord } = await supabase
                        .from('medical_records')
                        .select('current_medications')
                        .eq('patient_id', profile.id)
                        .maybeSingle();

                    if (medRecord) {
                        setVitalData(prev => ({
                            ...prev,
                            current_medications: medRecord.current_medications || []
                        }));
                    }

                } else {
                    setError("No se encontró información médica asociada.");
                }
            } catch (err: any) {
                console.error('Error:', err);
                setError(err.message || "Error al cargar el historial.");
            } finally {
                setLoading(false);
            }

        };

        const fetchAppointmentDetails = async () => {
            if (!appointmentId) return;

            const { data } = await supabase
                .from('appointments')
                .select('meeting_url, is_virtual')
                .eq('id', appointmentId)
                .single();

            if (data?.is_virtual) {
                // Use stored URL or generate one
                const url = data.meeting_url || `https://meet.jit.si/CorpoOriente-${appointmentId}`;
                setVideoUrl(url);
                // Don't auto-open, let the user click the button (requested behavior)
                // setIsVideoOpen(true); 
            }
        };

        fetchPatientData();
        fetchAppointmentDetails();
    }, [user, patientId, appointmentId, isConsultationMode]); // Added appointmentId and isConsultationMode

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full border-red-200 bg-red-50">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                        <h2 className="text-lg font-bold text-red-800 mb-2">Error de Carga</h2>
                        <p className="text-red-700">{error}</p>
                        <Link to="/dashboard" className="mt-4">
                            <Button variant="outline" className="border-red-200 text-red-800 hover:bg-red-100">
                                Volver al Inicio
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const patient = medicalHistory?.patient;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header Section */}
                <div className="mb-8 space-y-4">
                    <Link to="/dashboard" className="inline-flex items-center text-sm text-secondary/70 hover:text-primary transition-colors mb-2">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Volver al Panel
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="h-7 w-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Expediente Psicoterapéutico</h1>
                                <p className="text-slate-500">Historial clínico y seguimiento de sesiones</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg text-blue-700 border border-blue-100">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-sm">
                                Paciente:
                            </span>
                            <PatientNameDisplay patientId={patientId || patient?.id || ''} className="font-semibold text-sm" />
                        </div>

                        {videoUrl && (
                            <Button
                                onClick={() => setIsVideoOpen(!isVideoOpen)}
                                variant={isVideoOpen ? "secondary" : "default"}
                                className="gap-2"
                            >
                                <Video className="h-4 w-4" />
                                {isVideoOpen ? 'Ocultar Video' : 'Ver Videollamada'}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Sidebar: Vital Information (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {patientId && (
                            <VitalSignsCard
                                patientId={patientId}
                                data={vitalData}
                                onUpdate={() => {
                                    // Trigger a re-fetch of the patient data
                                    const event = new CustomEvent('refreshPatientData');
                                    window.dispatchEvent(event);
                                    // Or simply recall the fetch if possible, but for now we rely on parent state update strategy or reload
                                    // Actually, we can just call fetchPatientData if we move it out or use a trigger
                                    // Simplest for now: force a reload or pass a callback if we refactor fetchPatientData
                                    window.location.reload(); // Simple refresh to ensure all syncs up (though we could refine this)
                                }}
                            />
                        )}

                        {/* Quick Tip or Info Card */}
                        <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
                            <h3 className="font-semibold text-secondary mb-2">¿Información incorrecta?</h3>
                            <p className="text-sm text-secondary/80 mb-4">
                                Mantén actualizados los datos vitales para un mejor seguimiento clínico.
                            </p>
                        </div>
                    </div>

                    {/* Main Content: Timeline (8 cols) */}
                    <div className="lg:col-span-8">
                        <Card className="border-none shadow-md h-full">
                            <CardHeader className="border-b border-gray-100 bg-white sticky top-0 z-10 rounded-t-xl">
                                <CardTitle className="text-xl text-secondary">Evolución y Consultas</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {isConsultationMode && patientId && (
                                    <div className="mb-8 space-y-4">
                                        {/* Embedded Video Player */}
                                        {videoUrl && isVideoOpen && (
                                            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-200 shadow-sm animate-in fade-in duration-500">
                                                <div className="absolute top-2 right-2 z-10 flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-8 text-xs bg-white/90 hover:bg-white"
                                                        onClick={() => window.open(videoUrl, '_blank')}
                                                    >
                                                        <ExternalLink className="h-3 w-3 mr-1" />
                                                        Abrir en pestaña
                                                    </Button>
                                                </div>
                                                <iframe
                                                    src={videoUrl}
                                                    className="w-full h-full border-0"
                                                    allow="camera; microphone; display-capture; fullscreen"
                                                />
                                            </div>
                                        )}

                                        {videoUrl && !isVideoOpen && (
                                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center animate-in fade-in duration-500">
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Video className="h-6 w-6" />
                                                </div>
                                                <h3 className="font-semibold text-slate-900">Consulta Virtual Disponible</h3>
                                                <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">
                                                    Esta cita tiene una videollamada programada.
                                                </p>
                                                <Button
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm rounded-xl px-6 h-11"
                                                    onClick={() => setIsVideoOpen(true)}
                                                >
                                                    <Video className="h-4 w-4" />
                                                    Iniciar Videollamada
                                                </Button>
                                            </div>
                                        )}

                                        <MedicalEntryForm
                                            patientId={patientId}
                                            appointmentId={appointmentId || undefined}
                                            onSubmit={async (data) => {
                                                // If it's a consultation, we want to confirm completion
                                                if (appointmentId) {
                                                    setPendingEntryData(data); // Store data to save after confirmation
                                                    setIsFinishDialogOpen(true);
                                                } else {
                                                    // Just save entry (notes, etc)
                                                    await handleSaveEntry(data);
                                                }
                                            }}
                                            onCancel={() => {
                                                if (window.confirm("¿Seguro que desea cancelar la consulta actual? Se perderán los datos no guardados.")) {
                                                    navigate(`/medical-record?id=${patientId}`, { replace: true });
                                                }
                                            }}
                                        />
                                    </div>
                                )}

                                <AlertDialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Finalizar Consulta?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción guardará la entrada clínica y marcará la cita como <strong>Completada</strong>.
                                                <br /><br />
                                                El paciente recibirá una notificación de que su consulta ha finalizado.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={() => setIsFinishDialogOpen(false)}>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => {
                                                if (pendingEntryData) {
                                                    handleSaveEntry(pendingEntryData, true); // true = complete appointment
                                                }
                                                setIsFinishDialogOpen(false);
                                            }}>Confirmar y Finalizar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {medicalHistory || (upcomingAppointments && upcomingAppointments.length > 0) ? (
                                    <MedicalHistoryTimeline
                                        history={medicalHistory}
                                        upcoming={upcomingAppointments}
                                    />
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">Historial vacío</h3>
                                        <p className="text-gray-500">Aún no se han registrado consultas ni evoluciones.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default MedicalRecord;


