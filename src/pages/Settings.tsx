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
    const [doctorProfile, setDoctorProfile] = useState<any>(null);
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

                if (hasRole('doctor')) {
                    const { data: docData } = await supabase
                        .from('doctor_profiles')
                        .select('photo_url')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    setDoctorProfile(docData);
                }
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
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <div className="container mx-auto p-6 pt-10 space-y-6 max-w-6xl">
                {/* Header Minimalista */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-900 p-3 rounded-2xl shadow-2xl shadow-slate-200">
                            <SettingsIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mi Perfil</h1>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Configuración y Preferencias</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Columna Izquierda: Resumen Perfil */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-0 shadow-2xl shadow-slate-200/50 overflow-hidden bg-white rounded-[2.5rem]">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center relative overflow-hidden">
                                {/* Decoración de fondo */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full -ml-12 -mb-12 blur-2xl" />

                                <div className="relative inline-block">
                                    <div className="h-24 w-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20 mx-auto mb-4 shadow-2xl overflow-hidden">
                                        {(hasRole('doctor') && doctorProfile?.photo_url) || profileData?.avatar_url ? (
                                            <img
                                                src={doctorProfile?.photo_url || profileData?.avatar_url}
                                                alt="Avatar"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-10 w-10 text-white" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-teal-500 rounded-full border-4 border-slate-900 flex items-center justify-center">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-white mb-1">
                                    {profileData?.full_name || user?.user_metadata?.full_name || 'Usuario'}
                                </h2>
                                <p className="text-slate-400 text-xs font-medium mb-4">{user?.email}</p>

                                <div className="flex flex-wrap justify-center gap-2">
                                    {roles.map(role => {
                                        const badge = getRoleBadge(role);
                                        return (
                                            <Badge
                                                key={role}
                                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-[9px] font-bold uppercase tracking-widest py-1 backdrop-blur-sm shadow-none"
                                            >
                                                {badge.label}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>

                            <CardContent className="p-6 pt-8 space-y-5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-teal-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Miembro Desde</span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-800">
                                            {user?.created_at ? new Date(user.created_at).getFullYear() : '2024'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-blue-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</span>
                                        </div>
                                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-bold shadow-none">VERIFICADO</Badge>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-900 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mb-1">¿Necesitas Ayuda?</p>
                                    <p className="text-xs text-white font-medium">Soporte Técnico Corporativo</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha: Formularios */}
                    <div className="lg:col-span-8 space-y-8 pb-20">
                        {hasRole('patient') ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <PatientProfileForm />
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Sección Global para todos los empleados */}
                                <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-3 group">
                                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                                <User className="h-4 w-4 group-hover:text-white" />
                                            </div>
                                            DATOS PERSONALES
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                            <div className="p-5 rounded-2xl bg-[#FBFDFF] border border-slate-100 hover:border-teal-200 transition-all shadow-sm">
                                                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">Nombre Completo</p>
                                                <p className="text-slate-800 font-semibold text-lg">
                                                    {profileData?.full_name || user?.user_metadata?.full_name || 'No especificado'}
                                                </p>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-[#FBFDFF] border border-slate-100 hover:border-blue-200 transition-all shadow-sm">
                                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Correo Electrónico</p>
                                                <p className="text-slate-800 font-semibold text-lg">{user?.email}</p>
                                            </div>
                                        </div>

                                        <div className="mt-8 p-6 bg-amber-50 rounded-[1.5rem] border-2 border-dashed border-amber-200 flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                <Shield className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-amber-900">Seguridad y Privacidad</p>
                                                <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
                                                    Para actualizar tu nombre o correo institucional, por favor solicita un ticket a soporte administrativo.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Sección específica para Doctores (Formulario extendido) */}
                                {hasRole('doctor') && (
                                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                                        <DoctorProfileForm />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
