import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

interface UserRole {
    user_id: string;
    role: 'admin' | 'doctor' | 'receptionist' | 'patient';
    full_name?: string;
    email?: string;
}

export const AdminRoleManager = () => {
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) throw rolesError;

            const userIds = rolesData.map(r => r.user_id);

            // Try to fetch specific profiles
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', userIds);

            const combinedData = rolesData.map(r => {
                const profile = profilesData?.find(p => p.user_id === r.user_id);
                return {
                    ...r,
                    full_name: profile?.full_name || 'Sin nombre',
                    role: r.role as any
                };
            });

            setRoles(combinedData);
        } catch (error) {
            console.error('Error fetching roles:', error);
            toast.error('Error al cargar roles');
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole })
                .eq('user_id', userId);

            if (error) throw error;

            setRoles(roles.map(r => r.user_id === userId ? { ...r, role: newRole as any } : r));
            toast.success('Rol actualizado correctamente');
        } catch (error) {
            console.error('Error updating role:', error);
            toast.error('Error al actualizar el rol');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Gestión de Roles y Permisos
                </CardTitle>
                <CardDescription>
                    Asigna niveles de acceso a los usuarios del sistema.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Rol Actual</TableHead>
                                <TableHead>Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((userRole) => (
                                <TableRow key={userRole.user_id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{userRole.full_name}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {userRole.user_id.slice(0, 8)}...
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            userRole.role === 'admin' ? 'destructive' :
                                                userRole.role === 'doctor' ? 'default' :
                                                    userRole.role === 'receptionist' ? 'secondary' : 'outline'
                                        }>
                                            {userRole.role.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            defaultValue={userRole.role}
                                            onValueChange={(val) => updateUserRole(userRole.user_id, val)}
                                        >
                                            <SelectTrigger className="w-[140px] h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Administrador</SelectItem>
                                                <SelectItem value="doctor">Médico</SelectItem>
                                                <SelectItem value="receptionist">Recepcionista</SelectItem>
                                                <SelectItem value="patient">Paciente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
