import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MedicalHistoryTimeline } from '@/components/medical-records/MedicalHistoryTimeline';
import { useMedicalRecords, PatientMedicalHistory } from '@/hooks/useMedicalRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, Thermometer, Activity, Pill, AlertCircle, ArrowLeft, HeartPulse, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const MedicalRecord = () => {
    const { user } = useAuth();
    const { getPatientHistory } = useMedicalRecords();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<PatientMedicalHistory | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatientData = async () => {
            if (!user) return;

            try {
                setLoading(true);
                const { data: profile } = await supabase
                    .from('patient_profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (profile) {
                    const patientHistory = await getPatientHistory(profile.id);
                    setHistory(patientHistory);
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

    const medicalRecord = history?.medical_record;
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
                            <span className="font-medium text-sm">Paciente ID: {patient?.id?.slice(0, 8) || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Sidebar: Vital Information (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-none shadow-md overflow-hidden">
                            <div className="bg-secondary/5 p-4 border-b border-secondary/10">
                                <h2 className="font-semibold text-secondary flex items-center gap-2">
                                    <HeartPulse className="h-5 w-5 text-primary" />
                                    Datos Vitales
                                </h2>
                            </div>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-100">
                                    {/* Blood Type */}
                                    <div className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                        <div className="bg-red-100 p-2 rounded-full text-red-600">
                                            <Thermometer className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grupo Sanguíneo</p>
                                            <p className="text-lg font-bold text-secondary mt-1">
                                                {medicalRecord?.blood_type || 'No registrado'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Allergies */}
                                    <div className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                        <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                                            <Activity className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alergias</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {patient?.allergies?.length ? (
                                                    patient.allergies.map((a: string, i: number) => (
                                                        <span key={i} className="px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-md border border-orange-100">
                                                            {a}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-gray-500 italic">Ninguna conocida</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Medications */}
                                    <div className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                            <Pill className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medicación Actual</p>
                                            <div className="flex flex-col gap-2 mt-2">
                                                {medicalRecord?.current_medications?.length ? (
                                                    medicalRecord.current_medications.map((m: string, i: number) => (
                                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                                            <div className="h-1.5 w-1.5 bg-blue-400 rounded-full" />
                                                            {m}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-gray-500 italic">No hay medicamentos activos</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Tip or Info Card */}
                        <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
                            <h3 className="font-semibold text-secondary mb-2">¿Información incorrecta?</h3>
                            <p className="text-sm text-secondary/80 mb-4">
                                Si ves algún dato erróneo en tu ficha vital, por favor notifícalo en tu próxima consulta.
                            </p>
                            <Link to="/appointments">
                                <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/20 bg-transparent">
                                    Contactar Especialista
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Main Content: Timeline (8 cols) */}
                    <div className="lg:col-span-8">
                        <Card className="border-none shadow-md h-full">
                            <CardHeader className="border-b border-gray-100 bg-white sticky top-0 z-10 rounded-t-xl">
                                <CardTitle className="text-xl text-secondary">Evolución y Consultas</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
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
