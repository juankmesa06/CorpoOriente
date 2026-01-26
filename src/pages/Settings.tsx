import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { DoctorProfileForm } from '@/components/profile/DoctorProfileForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings as SettingsIcon, User, Mail, Shield, Calendar, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PatientProfileForm } from '@/components/profile/PatientProfileForm';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
    const { user, hasRole, roles } = useAuth();
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                setProfileData(data);
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    const getRoleBadge = (role: string) => {
        const config: Record<string, { label: string; variant: any; className: string }> = {
            admin: { label: 'Administrador', variant: 'destructive', className: 'bg-red-100 text-red-700 border-red-200' },
            super_admin: { label: 'Super Admin', variant: 'destructive', className: 'bg-purple-100 text-purple-700 border-purple-200' },
            doctor: { label: 'Médico', variant: 'default', className: 'bg-blue-100 text-blue-700 border-blue-200' },
            receptionist: { label: 'Recepcionista', variant: 'secondary', className: 'bg-teal-100 text-teal-700 border-teal-200' },
            patient: { label: 'Paciente', variant: 'outline', className: 'bg-slate-100 text-slate-700 border-slate-200' },
        };
        return config[role] || config.patient;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Navbar />
            <div className="container mx-auto p-6 pt-24 space-y-6 max-w-5xl">
                {/* Header */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-3 rounded-xl shadow-lg">
                            <SettingsIcon className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
                            <p className="text-slate-600">Gestiona tu información personal y preferencias</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Perfil del Paciente (Edición Completa) */}
                    {hasRole('patient') ? (
                        <PatientProfileForm />
                    ) : (
                        /* Perfil Mejorado para Admin/Receptionist/Doctor */
                        <Card className="border-0 shadow-xl overflow-hidden">
                            {/* Header con gradiente */}
                            <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                                            <User className="h-8 w-8 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">
                                                {profileData?.full_name || user?.user_metadata?.full_name || 'Usuario'}
                                            </h2>
                                            <p className="text-teal-100 text-sm">{user?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {roles.map(role => {
                                            const badge = getRoleBadge(role);
                                            return (
                                                <Badge
                                                    key={role}
                                                    className={`${badge.className} border font-semibold`}
                                                >
                                                    {badge.label}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Email */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <Mail className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Correo Electrónico</p>
                                                <p className="font-semibold text-slate-900">{user?.email}</p>
                                            </div>
                                        </div>
                                        {user?.email_confirmed_at && (
                                            <div className="flex items-center gap-1 mt-3 text-xs text-green-600">
                                                <CheckCircle2 className="h-3 w-3" />
                                                <span>Verificado</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Nombre Completo */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                <User className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Nombre Completo</p>
                                                <p className="font-semibold text-slate-900">
                                                    {profileData?.full_name || user?.user_metadata?.full_name || 'No especificado'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Roles */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
                                                <Shield className="h-5 w-5 text-teal-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Roles Asignados</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {roles.map(role => {
                                                const badge = getRoleBadge(role);
                                                return (
                                                    <Badge
                                                        key={role}
                                                        className={`${badge.className} border text-xs`}
                                                    >
                                                        {badge.label}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Fecha de Registro */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                                <Calendar className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Miembro Desde</p>
                                                <p className="font-semibold text-slate-900">
                                                    {user?.created_at
                                                        ? new Date(user.created_at).toLocaleDateString('es-ES', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })
                                                        : 'No disponible'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Teléfono si existe */}
                                    {profileData?.phone && (
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 md:col-span-2">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                                    <Mail className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Teléfono</p>
                                                    <p className="font-semibold text-slate-900">{profileData.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Info adicional */}
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-sm text-blue-800">
                                        <strong>Nota:</strong> Para actualizar tu información de perfil, contacta al administrador del sistema.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Sección específica para Doctores */}
                    {hasRole('doctor') && (
                        <DoctorProfileForm />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
