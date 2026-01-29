import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, Phone, Mail, FileText, Trash2, AlertTriangle, MessageCircle, Shield, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    blood_type?: string | null;
    allergies?: string[] | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    insurance_provider?: string | null;
    insurance_number?: string | null;
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
                .select('id, created_at, gender, date_of_birth, user_id, blood_type, allergies, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number')
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

    // Create Patient State
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newPatientName, setNewPatientName] = useState('');
    const [newPatientEmail, setNewPatientEmail] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreatePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: newPatientEmail,
                    full_name: newPatientName,
                    role: 'patient'
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success('Invitación enviada correctamente', {
                description: 'El paciente recibirá un correo para configurar su cuenta.'
            });

            setCreateDialogOpen(false);
            setNewPatientName('');
            setNewPatientEmail('');
            fetchPatients();

        } catch (error: any) {
            console.error('Error creating patient:', error);
            toast.error('Error al invitar paciente', {
                description: error.message || 'Error desconocido'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!patientToDelete?.profiles?.user_id) {
            toast.error("No se puede eliminar: ID de usuario no encontrado");
            return;
        }

        setIsDeleting(true);
        try {
            const { error } = await supabase.rpc('delete_user_by_id' as any, {
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
                        Directorio de pacientes
                    </CardTitle>
                    <CardDescription>
                        {isSuperAdmin
                            ? "Gestión completa de pacientes (Super Admin)"
                            : "Listado completo de pacientes registrados en la clínica"}
                    </CardDescription>
                    <div className="absolute right-6 top-6">
                        <Button
                            onClick={() => setCreateDialogOpen(true)}
                            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                            size="sm"
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Registrar Paciente
                        </Button>
                    </div>
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
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre / Email</TableHead>
                                        <TableHead>Teléfono</TableHead>
                                        <TableHead>Edad / Género</TableHead>
                                        <TableHead>Fecha registro</TableHead>
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
                                                <div className="text-xs text-muted-foreground flex flex-col gap-1 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {patient.profiles?.email || 'Sin email'}
                                                    </div>
                                                    {patient.insurance_provider && (
                                                        <div className="flex items-center gap-1 text-blue-600">
                                                            <Shield className="h-3 w-3" />
                                                            {patient.insurance_provider}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-4 w-4 text-gray-500" />
                                                        <span>{patient.phone || 'N/A'}</span>
                                                    </div>
                                                    {patient.emergency_contact_name && (
                                                        <div className="text-xs text-muted-foreground">
                                                            <span className="font-semibold text-red-500">Emergencia:</span>
                                                            <br />
                                                            {patient.emergency_contact_name}
                                                            <br />
                                                            {patient.emergency_contact_phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span>{getAge(patient.date_of_birth)}</span>
                                                        <Badge variant="outline" className="capitalize text-xs">
                                                            {patient.gender || 'No esp.'}
                                                        </Badge>
                                                    </div>
                                                    {patient.blood_type && (
                                                        <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 w-fit">
                                                            🩸 {patient.blood_type}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <Badge variant="secondary">
                                                        {format(new Date(patient.created_at), "d MMM yyyy", { locale: es })}
                                                    </Badge>
                                                </div>
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
            </Card >

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
                            ¿Eliminar paciente?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-muted-foreground text-sm">
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
                            </div>
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
                                'Eliminar definitivamente'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create Patient Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-teal-600" />
                            Registrar Nuevo Paciente
                        </DialogTitle>
                        <DialogDescription>
                            Envía una invitación por correo para que el paciente configure su cuenta.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreatePatient} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input
                                id="name"
                                placeholder="Ej: Maria Gonzalez"
                                value={newPatientName}
                                onChange={(e) => setNewPatientName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={newPatientEmail}
                                onChange={(e) => setNewPatientEmail(e.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isCreating}>
                                {isCreating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando invitación...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Enviar Invitación
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};
