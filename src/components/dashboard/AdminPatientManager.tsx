import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, Phone, Mail, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Patient {
    id: string;
    created_at: string;
    phone: string | null;
    gender: string | null;
    date_of_birth: string | null;
    profiles?: {
        full_name: string;
        email: string;
    };
}

export const AdminPatientManager = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            // 1. Fetch patient profiles first
            const { data: patientsData, error: patientsError } = await supabase
                .from('patient_profiles')
                .select('id, created_at, phone, gender, date_of_birth, user_id')
                .order('created_at', { ascending: false });

            if (patientsError) throw patientsError;

            if (!patientsData || patientsData.length === 0) {
                setPatients([]);
                return;
            }

            // 2. Extract user IDs to fetch profile details
            const userIds = patientsData.map(p => p.user_id).filter(Boolean);

            // 3. Fetch corresponding public profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, full_name, email')
                .in('user_id', userIds);

            if (profilesError) throw profilesError;

            // 4. Merge data
            const combinedData = patientsData.map(patient => {
                const profile = profilesData?.find(p => p.user_id === patient.user_id);
                return {
                    ...patient,
                    profiles: profile ? {
                        full_name: profile.full_name,
                        email: profile.email
                    } : undefined
                };
            });

            console.log('Patients data linked:', combinedData);
            setPatients(combinedData as Patient[]); // Cast to Patient[]
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAge = (dob: string | null) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970) + ' años';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Directorio de Pacientes
                </CardTitle>
                <CardDescription>
                    Listado completo de pacientes registrados en la clínica.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No hay pacientes registrados.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre / Email</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Edad / Género</TableHead>
                                    <TableHead>Fecha Registro</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patients.map((patient) => (
                                    <TableRow key={patient.id}>
                                        <TableCell>
                                            <div className="font-medium text-base">
                                                {patient.profiles?.full_name || 'Desconocido'}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Mail className="h-3 w-3" />
                                                {patient.profiles?.email || 'Sin email'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-gray-500" />
                                                <span>{patient.phone || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span>{getAge(patient.date_of_birth)}</span>
                                                <span className="text-xs text-muted-foreground capitalize">{patient.gender || 'No especificado'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {format(new Date(patient.created_at), "d MMM yyyy", { locale: es })}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* Future: Add 'View History' button */}
                                            <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200">
                                                <FileText className="h-3 w-3 mr-1" />
                                                Ver Expediente
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
