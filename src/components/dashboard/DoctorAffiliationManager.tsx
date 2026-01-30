import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users, UserCheck, UserX, TrendingUp, Trash2, Search, Stethoscope, Mail, Award, Calendar, UserPlus, Phone, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { CreateDoctorForm } from './CreateDoctorForm';
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

interface Doctor {
    user_id: string;
    specialty: string;
    is_affiliated: boolean;
    bio: string | null;
    license_number: string | null;
    consultation_fee: number | null;
    created_at: string;
    profile?: {
        full_name: string;
        email: string;
        phone: string | null;
    };
}

interface Stats {
    total: number;
    affiliated: number;
    notAffiliated: number;
    affiliationRate: number;
}

export const DoctorAffiliationManager = () => {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'affiliated' | 'not_affiliated'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState<Stats>({ total: 0, affiliated: 0, notAffiliated: 0, affiliationRate: 0 });
    const [doctorToDelete, setDoctorToDelete] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const { roles } = useAuth();

    // Check if current user is super admin
    const isSuperAdmin = roles.includes('super_admin');

    useEffect(() => {
        loadDoctors();
    }, []);

    useEffect(() => {
        applyFilter();
    }, [doctors, filter, searchQuery]);

    const loadDoctors = async () => {
        setLoading(true);

        // Obtener doctores con sus perfiles de usuario
        const { data: doctorProfiles, error } = await supabase
            .from('doctor_profiles')
            .select(`
                user_id,
                specialty,
                is_affiliated,
                bio,
                license_number,
                consultation_fee,
                created_at
            `)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Error al cargar médicos: ' + error.message);
            setLoading(false);
            return;
        }

        // Obtener información de perfiles de usuario
        const userIds = doctorProfiles?.map(d => d.user_id) || [];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone')
            .in('user_id', userIds);

        // Combinar datos
        const doctorsWithProfiles = doctorProfiles?.map(doctor => ({
            ...doctor,
            profile: profiles?.find(p => p.user_id === doctor.user_id)
        })) || [];

        setDoctors(doctorsWithProfiles);

        // Calcular estadísticas
        const total = doctorsWithProfiles.length;
        const affiliated = doctorsWithProfiles.filter(d => d.is_affiliated).length;
        const notAffiliated = total - affiliated;
        const affiliationRate = total > 0 ? Math.round((affiliated / total) * 100) : 0;

        setStats({ total, affiliated, notAffiliated, affiliationRate });
        setLoading(false);
    };

    const applyFilter = () => {
        let filtered = doctors;

        // Apply affiliation filter
        if (filter === 'affiliated') {
            filtered = filtered.filter(d => d.is_affiliated);
        } else if (filter === 'not_affiliated') {
            filtered = filtered.filter(d => !d.is_affiliated);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(d =>
                d.profile?.full_name?.toLowerCase().includes(query) ||
                d.profile?.email?.toLowerCase().includes(query) ||
                d.specialty?.toLowerCase().includes(query) ||
                d.license_number?.toLowerCase().includes(query)
            );
        }

        setFilteredDoctors(filtered);
    };

    const toggleAffiliation = async (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;

        const { error } = await supabase
            .from('doctor_profiles')
            .update({ is_affiliated: newStatus })
            .eq('user_id', userId);

        if (error) {
            toast.error('Error al actualizar afiliación: ' + error.message);
        } else {
            toast.success(
                newStatus
                    ? '✅ Médico afiliado correctamente'
                    : '❌ Médico desafiliado correctamente'
            );
            loadDoctors();
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleDeleteDoctor = async () => {
        if (!doctorToDelete) return;

        try {
            // Usar la función RPC para eliminar el usuario completamente (auth + public)
            const { error } = await supabase.rpc('delete_user_by_id' as any, {
                user_id: doctorToDelete
            });

            if (error) {
                console.error("Error RPC delete_user_by_id:", error);
                throw error;
            }

            toast.success('Usuario médico eliminado del sistema correctamente');
            loadDoctors();
        } catch (error: any) {
            console.error("Error deleting doctor:", error);
            toast.error('Error al eliminar médico: ' + (error.message || 'Error desconocido'));
        } finally {
            setDoctorToDelete(null);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Gestión de médicos
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Administración completa de médicos - Información técnica y profesional
                </p>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                <Users className="h-5 w-5 text-slate-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">Total médicos</p>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-white border-green-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <UserCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-green-700">Afiliados</p>
                        </div>
                        <p className="text-3xl font-bold text-green-600">{stats.affiliated}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <UserX className="h-5 w-5 text-orange-600" />
                            </div>
                            <p className="text-sm font-medium text-orange-700">No afiliados</p>
                        </div>
                        <p className="text-3xl font-bold text-orange-600">{stats.notAffiliated}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-blue-700">Tasa afiliación</p>
                        </div>
                        <p className="text-3xl font-bold text-blue-600">{stats.affiliationRate}%</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, email, especialidad o licencia..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los médicos</SelectItem>
                                <SelectItem value="affiliated">Solo afiliados</SelectItem>
                                <SelectItem value="not_affiliated">Solo no afiliados</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={() => setCreateDialogOpen(true)}
                            variant="brand"
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Crear médico
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de médicos */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                        Médicos ({filteredDoctors.length})
                    </CardTitle>
                    <CardDescription>
                        {isSuperAdmin
                            ? "Gestión completa de médicos (Super Admin)"
                            : "Gestión de afiliaciones de médicos"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <p className="text-center text-muted-foreground py-12">Cargando médicos...</p>
                    ) : filteredDoctors.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">
                            No hay médicos en esta categoría
                        </p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredDoctors.map((doctor) => (
                                <div
                                    key={doctor.user_id}
                                    className="p-6 hover:bg-slate-50/50 transition-colors group"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
                                            {getInitials(doctor.profile?.full_name || 'Dr')}
                                        </div>

                                        {/* Info Completa */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-xl font-bold text-slate-900">
                                                    {doctor.profile?.full_name || 'Sin nombre'}
                                                </h3>
                                                <Badge
                                                    variant={doctor.is_affiliated ? 'default' : 'secondary'}
                                                    className={doctor.is_affiliated
                                                        ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100'}
                                                >
                                                    {doctor.is_affiliated ? (
                                                        <>
                                                            <UserCheck className="h-3 w-3 mr-1" />
                                                            Afiliado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserX className="h-3 w-3 mr-1" />
                                                            No afiliado
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-slate-500" />
                                                    <span>{doctor.profile?.email || 'Sin email'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Stethoscope className="h-4 w-4 text-slate-500" />
                                                    <span>{doctor.specialty}</span>
                                                </div>
                                                {doctor.license_number && (
                                                    <div className="flex items-center gap-2">
                                                        <Award className="h-4 w-4 text-slate-500" />
                                                        <span>Lic. {doctor.license_number}</span>
                                                    </div>
                                                )}
                                                {doctor.profile?.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-4 w-4 text-slate-500" />
                                                        <span>{doctor.profile.phone}</span>
                                                    </div>
                                                )}
                                                {doctor.consultation_fee && (
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="h-4 w-4 text-slate-500" />
                                                        <span>${doctor.consultation_fee.toLocaleString('es-CO')} COP</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-500" />
                                                    <span>Registrado: {formatDate(doctor.created_at)}</span>
                                                </div>
                                            </div>

                                            {doctor.bio && (
                                                <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                                                    {doctor.bio}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                                <span className="text-sm font-medium text-slate-700">
                                                    {doctor.is_affiliated ? 'Desafiliar' : 'Afiliar'}
                                                </span>
                                                <Switch
                                                    checked={doctor.is_affiliated}
                                                    onCheckedChange={() => toggleAffiliation(doctor.user_id, doctor.is_affiliated)}
                                                />
                                            </div>

                                            {/* Delete button - only for super admin */}
                                            {isSuperAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => setDoctorToDelete(doctor.user_id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Información adicional */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-900">
                        <Users className="h-4 w-4" />
                        Sobre las afiliaciones
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                        <li className="flex items-start gap-2">
                            <UserCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span><strong>Médicos afiliados:</strong> Aparecen en la lista de doctores para citas, pueden gestionar pacientes y alquilar espacios</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <UserX className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span><strong>Médicos no afiliados:</strong> Solo pueden alquilar espacios, no aparecen en la lista de doctores</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>Los pacientes solo ven médicos afiliados al agendar citas</span>
                        </li>
                        {!isSuperAdmin && (
                            <li className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-300">
                                <span className="text-xs text-blue-700">
                                    ℹ️ <strong>Nota:</strong> Solo el Super Admin puede eliminar médicos del sistema
                                </span>
                            </li>
                        )}
                    </ul>
                </CardContent>
            </Card>

            {/* Delete Dialog */}
            <AlertDialog open={!!doctorToDelete} onOpenChange={(open) => !open && setDoctorToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>Esta acción eliminará permanentemente al médico del sistema.</p>
                            <div className="bg-red-50 p-3 rounded-md text-sm text-red-800 border border-red-200">
                                <strong>Advertencia:</strong> Se eliminará:
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>La cuenta de usuario y acceso</li>
                                    <li>Perfil de médico y datos profesionales</li>
                                    <li>Historial de citas y pacientes asociados</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteDoctor}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Eliminar definitivamente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create Doctor Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <UserPlus className="h-6 w-6 text-teal-600" />
                            Crear nuevo médico
                        </DialogTitle>
                        <DialogDescription>
                            Ingrese la información del nuevo médico. Se enviará un correo para configurar su contraseña.
                        </DialogDescription>
                    </DialogHeader>
                    <CreateDoctorForm
                        onSuccess={() => {
                            setCreateDialogOpen(false);
                            loadDoctors();
                            toast.success('Médico creado y lista actualizada');
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};
