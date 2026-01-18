import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Doctor {
    user_id: string;
    specialty: string;
    is_affiliated: boolean;
    bio: string | null;
    license_number: string | null;
    created_at: string;
    profile?: {
        full_name: string;
        email: string;
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
    const [stats, setStats] = useState<Stats>({ total: 0, affiliated: 0, notAffiliated: 0, affiliationRate: 0 });

    useEffect(() => {
        loadDoctors();
    }, []);

    useEffect(() => {
        applyFilter();
    }, [doctors, filter]);

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
            .select('user_id, full_name, email')
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

        if (filter === 'affiliated') {
            filtered = doctors.filter(d => d.is_affiliated);
        } else if (filter === 'not_affiliated') {
            filtered = doctors.filter(d => !d.is_affiliated);
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

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Gestión de Afiliaciones
                        </CardTitle>
                        <CardDescription>
                            Administra qué médicos están afiliados a la corporación
                        </CardDescription>
                    </div>
                    <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los médicos</SelectItem>
                            <SelectItem value="affiliated">Solo afiliados</SelectItem>
                            <SelectItem value="not_affiliated">Solo no afiliados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Total Médicos</p>
                                </div>
                                <p className="text-3xl font-bold">{stats.total}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserCheck className="h-4 w-4 text-green-600" />
                                    <p className="text-sm text-muted-foreground">Afiliados</p>
                                </div>
                                <p className="text-3xl font-bold text-green-600">{stats.affiliated}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserX className="h-4 w-4 text-orange-600" />
                                    <p className="text-sm text-muted-foreground">No Afiliados</p>
                                </div>
                                <p className="text-3xl font-bold text-orange-600">{stats.notAffiliated}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Tasa Afiliación</p>
                                </div>
                                <p className="text-3xl font-bold">{stats.affiliationRate}%</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Lista de médicos */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">
                            Médicos ({filteredDoctors.length})
                        </h3>
                        {loading ? (
                            <p className="text-center text-muted-foreground py-8">Cargando médicos...</p>
                        ) : filteredDoctors.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No hay médicos en esta categoría
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {filteredDoctors.map((doctor) => (
                                    <div
                                        key={doctor.user_id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium">
                                                    {doctor.profile?.full_name || 'Sin nombre'}
                                                </p>
                                                <Badge variant={doctor.is_affiliated ? 'default' : 'secondary'}>
                                                    {doctor.is_affiliated ? (
                                                        <>
                                                            <UserCheck className="h-3 w-3 mr-1" />
                                                            Afiliado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserX className="h-3 w-3 mr-1" />
                                                            No Afiliado
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {doctor.specialty} • {doctor.profile?.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Registrado: {formatDate(doctor.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">
                                                    {doctor.is_affiliated ? 'Desafiliar' : 'Afiliar'}
                                                </span>
                                                <Switch
                                                    checked={doctor.is_affiliated}
                                                    onCheckedChange={() => toggleAffiliation(doctor.user_id, doctor.is_affiliated)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Información adicional */}
                    <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">ℹ️ Sobre las afiliaciones</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• <strong>Médicos Afiliados:</strong> Aparecen en la lista de doctores para citas, pueden gestionar pacientes y alquilar espacios</li>
                            <li>• <strong>Médicos No Afiliados:</strong> Solo pueden alquilar espacios, no aparecen en la lista de doctores</li>
                            <li>• Los pacientes solo ven médicos afiliados al agendar citas</li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
