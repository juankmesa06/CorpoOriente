
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PatientNameDisplay } from '@/components/dashboard/PatientNameDisplay';
import { MedicalHistoryTimeline } from '@/components/medical-records/MedicalHistoryTimeline';
import { VitalSignsCard } from '@/components/medical-records/VitalSignsCard';
import { useMedicalRecords, PatientMedicalHistory } from '@/hooks/useMedicalRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, Thermometer, Activity, Pill, AlertCircle, ArrowLeft, HeartPulse, User } from 'lucide-react';
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
    const [history, setHistory] = useState<PatientMedicalHistory | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [vitalData, setVitalData] = useState<any>({
        blood_type: null,
        allergies: [],
        current_medications: []
    });

    // Dialog state
    const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
    const [pendingEntryData, setPendingEntryData] = useState<CreateEntryInput | null>(null);

    const handleSaveEntry = async (data: CreateEntryInput, completeAppointment = false) => {
        try {
            // 1. Create Entry
            await createEntry(data);

            // 2. If completing, update appointment status and notify
            if (completeAppointment && appointmentId) {
                // Update appointment status directly
                await supabase
                    .from('appointments')
                    .update({ status: 'completed' })
                    .eq('id', appointmentId);

                // Notify Patient (if patientId matches a user)
                if (patientId) {
                    const { data: pProfile } = await supabase
                        .from('patient_profiles')
                        .select('user_id')
                        .eq('id', patientId)
                        .single();

                    if (pProfile?.user_id) {
                        await supabase
                            .from('notifications')
                            .insert([{
                                user_id: pProfile.user_id,
                                title: 'Consulta Finalizada',
                                message: `El Dr. ${user?.user_metadata?.full_name || 'su médico'} ha finalizado la consulta y actualizado su historial.`,
                                type: 'success'
                            }]);
                    }
                }
            }

            toast.success(completeAppointment ? "Consulta finalizada y guardada" : "Entrada guardada exitosamente");

            // Refresh history
            if (patientId) {
                const updatedHistory = await getPatientHistory(patientId);
                setHistory(updatedHistory);
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

                    // 2. Fetch History using RPC
                    try {
                        const patientHistory = await getPatientHistory(profile.id);
                        setHistory(patientHistory);
                    } catch (e) {
                        console.log("No medical history found or error fetching it");
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
                    setError("No econtró información médica asociada.");
                }
            } catch (err: any) {
                console.error('Error:', err);
                setError(err.message || "Error al cargar el historial.");
            } finally {
                setLoading(false);
            }
        };

        fetchPatientData();
    }, [user]);

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

    const patient = history?.patient;

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
                                <h1 className="text-2xl font-bold text-secondary">Mi Historial Médico</h1>
                                <p className="text-muted-foreground">Expediente clínico digital y seguimiento</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg text-blue-700 border border-blue-100">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-sm">
                                Paciente: <PatientNameDisplay patientId={patientId || patient?.id || ''} className="font-semibold" />
                            </span>
                        </div>
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
                                    <div className="mb-8">
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

                                {history && (
                                    <MedicalHistoryTimeline
                                        history={history}
                                        isReadOnly={true}
                                    />
                                )}
                                {!history && (
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
