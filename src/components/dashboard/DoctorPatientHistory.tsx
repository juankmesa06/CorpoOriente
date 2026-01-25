import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Patient {
    patient_id: string;
    patient_name: string;
    patient_email: string;
    last_appointment: string;
    total_appointments: number;
    status: string;
}

interface DoctorPatientHistoryProps {
    onSelectPatient?: (patientId: string) => void;
}

export const DoctorPatientHistory = ({ onSelectPatient }: DoctorPatientHistoryProps) => {
    const { user } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPatients, setTotalPatients] = useState(0);

    useEffect(() => {
        if (user) {
            loadPatients();
        }
    }, [user]);

    const loadPatients = async () => {
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

        // Obtener relaciones doctor-paciente
        const { data: relationships, error } = await supabase
            .from('doctor_patients')
            .select(`
                patient_id,
                status,
                patient_profiles!inner(
                    id,
                    profiles:profiles!inner(
                        full_name,
                        email
                    )
                )
            `)
            .eq('doctor_id', doctorProfile.id);

        if (error) {
            toast.error('Error al cargar pacientes');
            setLoading(false);
            return;
        }

        // Para cada paciente, obtener su última cita y total de citas
        const patientList: Patient[] = [];

        for (const rel of relationships || []) {
            const patientProfile = rel.patient_profiles as any;

            // Obtener citas del paciente con este doctor
            const { data: appointments } = await supabase
                .from('appointments')
                .select('start_time, status')
                .eq('doctor_id', doctorProfile.id)
                .eq('patient_id', rel.patient_id)
                .order('start_time', { ascending: false });

            const totalAppointments = appointments?.length || 0;
            const lastAppointment = appointments?.[0]?.start_time || null;

            patientList.push({
                patient_id: rel.patient_id,
                patient_name: patientProfile?.profiles?.full_name || 'Paciente',
                patient_email: patientProfile?.profiles?.email || '',
                last_appointment: lastAppointment,
                total_appointments: totalAppointments,
                status: rel.status
            });
        }

        // Ordenar por última cita (más reciente primero)
        patientList.sort((a, b) => {
            if (!a.last_appointment) return 1;
            if (!b.last_appointment) return -1;
            return new Date(b.last_appointment).getTime() - new Date(a.last_appointment).getTime();
        });

        setPatients(patientList);
        setTotalPatients(patientList.length);
        setLoading(false);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Sin citas';
        return new Date(dateString).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary'> = {
            active: 'default',
            inactive: 'secondary'
        };

        const labels: Record<string, string> = {
            active: 'Activo',
            inactive: 'Inactivo'
        };

        return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Mis Pacientes
                        </CardTitle>
                        <CardDescription>Historial de pacientes bajo tu cuidado</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                        {totalPatients} {totalPatients === 1 ? 'Paciente' : 'Pacientes'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-center text-muted-foreground py-8">Cargando pacientes...</p>
                ) : patients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        Aún no tienes pacientes asignados
                    </p>
                ) : (
                    <div className="space-y-2">
                        {patients.map((patient) => (
                            <div
                                key={patient.patient_id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium">{patient.patient_name}</p>
                                        {getStatusBadge(patient.status)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {patient.patient_email}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Última cita: {formatDate(patient.last_appointment)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            {patient.total_appointments} {patient.total_appointments === 1 ? 'cita' : 'citas'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSelectPatient?.(patient.patient_id)}
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Ver Detalles
                                    </Button>
                                    <Link to={`/medical-record?id=${patient.patient_id}`}>
                                        <Button variant="ghost" size="icon" title="Ir a Historia Clínica">
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
