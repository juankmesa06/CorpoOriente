import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Shield,
    User,
    Search,
    Trash2,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserRole {
    user_id: string;
    role: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'super_admin';
    full_name?: string;
    email?: string;
    avatar_url?: string;
}

export const AdminRoleManager = () => {
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredRoles, setFilteredRoles] = useState<UserRole[]>([]);

    // Deletion State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserRole | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredRoles(roles);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = roles.filter(r =>
                (r.full_name?.toLowerCase().includes(lowerTerm) || '') ||
                (r.email?.toLowerCase().includes(lowerTerm) || '') ||
                (r.role.toLowerCase().includes(lowerTerm))
            );
            setFilteredRoles(filtered);
        }
    }, [searchTerm, roles]);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) throw rolesError;

            const userIds = rolesData.map(r => r.user_id);

            // Try to fetch specific profiles
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('user_id, full_name, email, avatar_url')
                .in('user_id', userIds);

            const combinedData = rolesData.map(r => {
                const profile = profilesData?.find(p => p.user_id === r.user_id);
                return {
                    ...r,
                    full_name: profile?.full_name || 'Sin nombre',
                    email: profile?.email || '---',
                    avatar_url: profile?.avatar_url,
                    role: r.role as any
                };
            });

            setRoles(combinedData);
            setFilteredRoles(combinedData);
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

    const handleDeleteUser = async () => {
        if (!userToDelete?.user_id) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase.rpc('delete_user_by_id', {
                user_id: userToDelete.user_id
            });

            if (error) throw error;

            toast.success("Usuario eliminado correctamente del sistema");
            setRoles(roles.filter(r => r.user_id !== userToDelete.user_id));
            setDeleteDialogOpen(false);
            setUserToDelete(null);

        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error("Error al eliminar usuario: " + (error.message || "Error desconocido"));
        } finally {
            setIsDeleting(false);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100';
            case 'admin': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100';
            case 'doctor': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100';
            case 'receptionist': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100';
            default: return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'super_admin': return 'Super Admin';
            case 'admin': return 'Administrador';
            case 'doctor': return 'Médico / Especialista';
            case 'receptionist': return 'Recepción';
            case 'patient': return 'Paciente';
            default: return role;
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Roles y Permisos</h3>
                        <p className="text-sm text-muted-foreground mt-1">Control de acceso y administración de usuarios del sistema.</p>
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o rol..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-slate-50/50">
                                    <TableHead className="py-4">Usuario</TableHead>
                                    <TableHead>Email / ID</TableHead>
                                    <TableHead>Rol Asignado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" /> Cargando usuarios...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRoles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No se encontraron usuarios.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRoles.map((userRole) => (
                                        <TableRow key={userRole.user_id} className="group hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border border-slate-200">
                                                        <AvatarImage src={userRole.avatar_url} />
                                                        <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                                                            {getInitials(userRole.full_name || 'U')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-900">{userRole.full_name}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span className="text-slate-600">{userRole.email}</span>
                                                    <span className="font-mono text-xs text-slate-400 mt-0.5">ID: {userRole.user_id.slice(0, 8)}...</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`${getRoleBadgeColor(userRole.role)} px-2.5 py-0.5 transition-colors`}>
                                                    {userRole.role === 'super_admin' && <Shield className="w-3 h-3 mr-1" />}
                                                    {getRoleLabel(userRole.role)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <Select
                                                        defaultValue={userRole.role}
                                                        onValueChange={(val) => updateUserRole(userRole.user_id, val)}
                                                        disabled={userRole.role === 'super_admin'}
                                                    >
                                                        <SelectTrigger className="w-[160px] h-8 text-xs bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">Administrador</SelectItem>
                                                            <SelectItem value="doctor">Médico / Especialista</SelectItem>
                                                            <SelectItem value="receptionist">Recepcionista</SelectItem>
                                                            <SelectItem value="patient">Paciente</SelectItem>
                                                        </SelectContent>
                                                    </Select>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                        disabled={userRole.role === 'super_admin'}
                                                        onClick={() => {
                                                            setUserToDelete(userRole);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            ¿Eliminar Usuario del Sistema?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-3">
                                <p>
                                    Estás a punto de eliminar a <strong>{userToDelete?.full_name}</strong> ({getRoleLabel(userToDelete?.role || '')}).
                                </p>
                                <div className="bg-red-50 p-3 rounded-md text-sm text-red-800 border border-red-200">
                                    <strong>¡Acción Destructiva!</strong> Se eliminará permanentemente:
                                    <ul className="list-disc pl-5 mt-1 space-y-1">
                                        <li>La cuenta de acceso.</li>
                                        <li>Perfiles de médico/paciente asociados.</li>
                                        <li>Historial de citas y configuraciones.</li>
                                    </ul>
                                </div>
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
                                'Eliminar Definitivamente'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
