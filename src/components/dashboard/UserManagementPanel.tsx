import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Trash2, Mail, Shield, UserCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
}

export const UserManagementPanel = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    // Form state for creating users
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'receptionist' as 'admin' | 'receptionist'
    });

    const loadUsers = async () => {
        setLoading(true);
        try {
            // Get user roles for non-doctor users
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('role', ['admin', 'receptionist']);

            if (rolesError) throw rolesError;

            if (!roles || roles.length === 0) {
                setUsers([]);
                return;
            }

            // Get profiles for those users
            const userIds = roles.map(r => r.user_id);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, full_name, email, created_at')
                .in('user_id', userIds);

            if (profilesError) throw profilesError;

            // Combine data
            const usersData: User[] = roles.map(roleEntry => {
                const profile = profiles?.find(p => p.user_id === roleEntry.user_id);
                return {
                    id: roleEntry.user_id,
                    email: profile?.email || 'Sin email',
                    full_name: profile?.full_name || null,
                    role: roleEntry.role,
                    created_at: profile?.created_at || new Date().toISOString()
                };
            });

            setUsers(usersData);
        } catch (error: any) {
            console.error('Error loading users:', error);
            toast.error('Error al cargar usuarios: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreateUser = async () => {
        if (!formData.email || !formData.full_name) {
            toast.error('Por favor completa el nombre y correo electrónico');
            return;
        }

        setLoading(true);
        try {
            // Create user using Edge Function - sends invitation email
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.role
                }
            });

            if (error) throw error;

            toast.success(
                `Invitación enviada a ${formData.email}. El usuario recibirá un correo para crear su contraseña.`,
                { duration: 6000 }
            );
            setIsCreateDialogOpen(false);
            resetForm();

            // Refresh user list after a short delay
            setTimeout(() => loadUsers(), 1000);
        } catch (error: any) {
            console.error('Error creating user:', error);
            let errorMessage = error.message;

            // Try to parse the error body if it exists (for FunctionsHttpError)
            if (error.context && typeof error.context.json === 'function') {
                try {
                    const errorBody = await error.context.json();
                    if (errorBody && errorBody.error) {
                        errorMessage = errorBody.error;
                    }
                } catch (e) {
                    console.error('Error parsing error context:', e);
                }
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            toast.error('Error al enviar invitación: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`¿Estás seguro de eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        setDeletingUserId(userId);
        try {
            // Use the existing RPC function
            const { error } = await supabase.rpc('delete_user_by_id' as any, { user_id: userId });

            if (error) throw error;

            toast.success('Usuario eliminado exitosamente');
            loadUsers();
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error('Error al eliminar usuario: ' + error.message);
        } finally {
            setDeletingUserId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            email: '',
            full_name: '',
            role: 'receptionist'
        });
    };

    const getRoleBadge = (role: string) => {
        const config = {
            admin: { label: 'Administrador', className: 'bg-red-100 text-red-700 border-red-200' },
            receptionist: { label: 'Recepcionista', className: 'bg-blue-100 text-blue-700 border-blue-200' },
            patient: { label: 'Paciente', className: 'bg-slate-100 text-slate-700 border-slate-200' }
        };
        const c = config[role as keyof typeof config] || config.patient;
        return <Badge className={`${c.className} border`}>{c.label}</Badge>;
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <Shield className="h-4 w-4 text-red-600" />;
            case 'receptionist': return <UserCircle className="h-4 w-4 text-blue-600" />;
            default: return <UserCircle className="h-4 w-4 text-slate-600" />;
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-slate-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">Gestión de usuarios administrativos</CardTitle>
                            <CardDescription>
                                Crear y administrar usuarios del staff (Administradores, Recepcionistas)
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadUsers}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Actualizar
                            </Button>
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-primary hover:bg-primary/90">
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Nuevo usuario
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Crear usuario administrativo</DialogTitle>
                                        <DialogDescription>
                                            Completa la información para crear un nuevo administrador o recepcionista.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="role">Tipo de usuario</Label>
                                            <Select
                                                value={formData.role}
                                                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Administrador</SelectItem>
                                                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="full_name">Nombre completo</Label>
                                            <Input
                                                id="full_name"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                placeholder="Ej: Juan Pérez"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Correo electrónico</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    className="pl-8"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="correo@ejemplo.com"
                                                />
                                            </div>
                                        </div>

                                        <Alert>
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription className="text-xs">
                                                El usuario recibirá un correo de invitación para configurar su contraseña de acceso.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button onClick={handleCreateUser} disabled={loading}>
                                            {loading ? 'Enviando invitación...' : 'Enviar invitación'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Correo electrónico</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Fecha de creación</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Cargando usuarios...
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No hay usuarios registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(user.role)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {user.full_name || <span className="text-muted-foreground italic">Sin nombre</span>}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                                disabled={deletingUserId === user.id}
                                            >
                                                {deletingUserId === user.id ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Eliminar
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
