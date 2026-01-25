import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, Phone, Mail, FileText, Trash2, AlertTriangle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
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

interface Patient {
    id: string;
    created_at: string;
    phone: string | null;
    gender: string | null;
    date_of_birth: string | null;
    profiles?: {
        full_name: string;
        email: string;
        user_id: string;
    };
}

import { MedicalRecordModal } from './MedicalRecordModal';

export const AdminPatientManager = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedPatientName, setSelectedPatientName] = useState<string>('');
    const [isRecordsOpen, setIsRecordsOpen] = useState(false);
    const { roles } = useAuth();

    // Check if current user is super admin
    const isSuperAdmin = roles.includes('super_admin');

    // Deletion State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            // 1. Fetch patient profiles
            const { data: patientsData, error: patientsError } = await supabase
                .from('patient_profiles')
                .select('id, created_at, gender, date_of_birth, user_id')
                .order('created_at', { ascending: false });

            if (patientsError) throw patientsError;

            if (!patientsData || patientsData.length === 0) {
                setPatients([]);
                return;
            }

            // 2. Extract user IDs
            const userIds = patientsData.map(p => p.user_id).filter(Boolean);

            // 3. Fetch corresponding public profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, full_name, email, phone')
                .in('user_id', userIds);

            if (profilesError) throw profilesError;

            // 4. Merge data
            const combinedData = patientsData.map(patient => {
                const profile = profilesData?.find(p => p.user_id === patient.user_id);
                return {
                    ...patient,
                    phone: profile?.phone || null,
                    profiles: profile ? {
                        full_name: profile.full_name,
                        email: profile.email,
                        user_id: profile.user_id
                    } : undefined
                };
            });

            setPatients(combinedData as Patient[]);
        } catch (error) {
            console.error('Error fetching patients:', error);
            toast.error("Error al cargar la lista de pacientes");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!patientToDelete?.profiles?.user_id) {
            toast.error("No se puede eliminar: ID de usuario no encontrado");
            return;
        }

        setIsDeleting(true);
        try {
            const { error } = await supabase.rpc('delete_user_by_id', {
                user_id: patientToDelete.profiles.user_id
            });

            if (error) throw error;

            toast.success("Paciente y usuario eliminados correctamente del sistema");
            fetchPatients(); // Refresh list
            setDeleteDialogOpen(false);
            setPatientToDelete(null);

        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error("Error al eliminar el usuario: " + (error.message || "Error desconocido"));
        } finally {
            setIsDeleting(false);
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
        <>
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-5 w-5 text-blue-600" />
                        Directorio de Pacientes
                    </CardTitle>
                    <CardDescription>
                        {isSuperAdmin
                            ? "Gestión completa de pacientes (Super Admin)"
                            : "Listado completo de pacientes registrados en la clínica"}
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
                                                <div className="flex justify-end gap-2">
                                                    {/* For receptionist: WhatsApp and Call buttons */}
                                                    {roles.includes('receptionist') && !roles.includes('admin') && !roles.includes('super_admin') ? (
                                                        <>
                                                            {/* WhatsApp Button */}
                                                            {patient.phone && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                                                    onClick={() => {
                                                                        const phone = patient.phone?.replace(/\D/g, '');
                                                                        window.open(`https://wa.me/${phone}`, '_blank');
                                                                    }}
                                                                >
                                                                    <MessageCircle className="h-3 w-3 mr-1" />
                                                                    WhatsApp
                                                                </Button>
                                                            )}

                                                            {/* Call Button */}
                                                            {patient.phone && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                                                    onClick={() => {
                                                                        window.location.href = `tel:${patient.phone}`;
                                                                    }}
                                                                >
                                                                    <Phone className="h-3 w-3 mr-1" />
                                                                    Llamar
                                                                </Button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        /* For admin/super_admin: Medical Record button */
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => {
                                                                setSelectedPatientId(patient.id);
                                                                setSelectedPatientName(patient.profiles?.full_name || 'Paciente');
                                                                setIsRecordsOpen(true);
                                                            }}
                                                        >
                                                            <FileText className="h-3 w-3 mr-1" />
                                                            Expediente
                                                        </Button>
                                                    )}

                                                    {/* Delete button - only for super admin */}
                                                    {isSuperAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => {
                                                                setPatientToDelete(patient);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <MedicalRecordModal
                open={isRecordsOpen}
                onOpenChange={setIsRecordsOpen}
                patientId={selectedPatientId}
                patientName={selectedPatientName}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            ¿Eliminar Paciente?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Estás a punto de eliminar permanentemente a <strong>{patientToDelete?.profiles?.full_name || 'este usuario'}</strong> del sistema.
                            </p>
                            <div className="bg-red-50 p-3 rounded-md text-sm text-red-800 border border-red-200">
                                <strong>⚠️ Advertencia:</strong> Esta acción es irreversible. Se eliminará:
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>La cuenta de usuario y acceso</li>
                                    <li>Perfil de paciente y datos personales</li>
                                    <li>Historial de citas y expedientes médicos</li>
                                    <li>Todos los registros asociados</li>
                                </ul>
                            </div>
                            {!isSuperAdmin && (
                                <p className="text-xs text-muted-foreground">
                                    ℹ️ Solo el Super Admin puede eliminar pacientes del sistema
                                </p>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                'Eliminar Definitivamente'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
