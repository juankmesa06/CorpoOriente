import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RoomManagement } from './RoomManagement';
import { RoomReports } from './RoomReports';
import { DoctorAffiliationManager } from './DoctorAffiliationManager';
import { AdminPatientManager } from './AdminPatientManager';
import { AdminAppointmentManager } from '@/components/admin/AdminAppointmentManager';

const AdminDashboard = () => {
    const [isSyncing, setIsSyncing] = useState(false);

    const syncProfiles = async () => {
        setIsSyncing(true);
        const toastId = toast.loading('Sincronizando perfiles de médicos...');

        try {
            // Consultamos roles de doctor
            const { data: doctorsWithoutProfile, error: fetchError } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'doctor');

            if (fetchError) throw fetchError;

            if (!doctorsWithoutProfile || doctorsWithoutProfile.length === 0) {
                toast.success('No se encontraron perfiles para sincronizar', { id: toastId });
                return;
            }

            let syncCount = 0;
            for (const doc of doctorsWithoutProfile) {
                // Intentar insertar si no existe (backfill)
                const { error: insertError } = await supabase
                    .from('doctor_profiles')
                    .insert({
                        user_id: doc.user_id,
                        specialty: 'Psicoterapeuta'
                    });

                if (!insertError) syncCount++;
            }

            toast.success(`Sincronización completada: ${syncCount} perfiles procesados`, {
                id: toastId,
                icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
            });
        } catch (err: any) {
            console.error('Sync error:', err);
            toast.error('Error en la sincronización: ' + err.message, {
                id: toastId,
                icon: <AlertCircle className="h-4 w-4 text-destructive" />
            });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        Mantenimiento del Sistema
                    </CardTitle>
                    <CardDescription>Utilidades para asegurar la integridad de los datos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="text-sm">
                            <p className="font-medium">Sincronizar Perfiles de Médicos</p>
                            <p className="text-muted-foreground">Asegura que todos los médicos tengan su ficha profesional creada.</p>
                        </div>
                        <Button onClick={syncProfiles} disabled={isSyncing} variant="secondary">
                            {isSyncing ? 'Sincronizando...' : 'Ejecutar Sincronización'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Admin Appointment Booking */}
            <AdminAppointmentManager />

            {/* Room Management Section */}
            <RoomManagement />

            {/* Room Reports Section */}
            <RoomReports />

            {/* Doctor Affiliation Management */}
            <DoctorAffiliationManager />

            {/* Patient Management Section */}
            <AdminPatientManager />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Panel de Administración
                    </CardTitle>
                    <CardDescription>Gestiona usuarios, roles y configuración del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">Gestionar usuarios</Button>
                    <Button variant="outline" className="w-full justify-start">Configurar organización</Button>
                    <Button variant="outline" className="w-full justify-start">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Reportes Contables
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminDashboard;
