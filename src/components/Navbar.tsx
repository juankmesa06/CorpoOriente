import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, LogOut, UserCircle, Settings, Calendar, FileText, LayoutDashboard } from 'lucide-react';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Navbar = () => {
    const { user, roles, signOut, hasRole } = useAuth();
    const navigate = useNavigate();
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        const fetchUserName = async () => {
            if (user) {
                // Don't fetch name for admins
                if (roles.includes('admin') || roles.includes('super_admin')) {
                    return;
                }

                const { data } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data?.full_name) {
                    setUserName(data.full_name);
                }
            }
        };
        fetchUserName();
    }, [user, roles]);

    const getRoleBadgeConfig = (role: string) => {
        const configs: Record<string, { className: string; label: string }> = {
            admin: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Administrador' },
            super_admin: { className: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Super Admin' },
            doctor: { className: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Médico' },
            receptionist: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Recepcionista' },
            patient: { className: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Paciente' },
        };
        return configs[role] || configs.patient;
    };

    return (
        <header className="border-b border-slate-200 bg-white py-4 sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto px-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 rounded-xl shadow-md">
                        <Stethoscope className="h-6 w-6 text-white" />
                    </div>
                    <div className="hidden md:block">
                        <h1 className="text-xl font-bold leading-tight">
                            <span className="text-teal-600">Centro</span>{" "}
                            <span className="text-slate-900">PsicoTerapéutico</span>
                        </h1>
                        <p className="text-xs text-slate-500">de Oriente</p>
                    </div>
                    <h1 className="text-xl font-bold text-teal-600 md:hidden">CPTO</h1>
                </Link>

                <nav className="hidden lg:flex items-center gap-6 mx-8">
                    <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </Link>
                    {!roles.includes('super_admin') && !roles.includes('admin') && !roles.includes('receptionist') && (
                        <>
                            <Link to="/appointments" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors">
                                <Calendar className="h-4 w-4" />
                                {hasRole('patient') ? 'Mis Citas' : 'Agenda'}
                            </Link>

                            <Link to="/settings" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors">
                                <Settings className="h-4 w-4" />
                                Configuración
                            </Link>
                        </>
                    )}
                </nav>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">
                            {roles.includes('super_admin') ? 'Super Administrador' :
                                roles.includes('admin') ? 'Administrador' :
                                    (userName || user?.email?.split('@')[0])}
                        </span>
                    </div>
                    {/* Show only primary role */}
                    {(() => {
                        // Priority order: super_admin > admin > receptionist > doctor > patient
                        let primaryRole = '';
                        if (roles.includes('super_admin')) primaryRole = 'super_admin';
                        else if (roles.includes('admin')) primaryRole = 'admin';
                        else if (roles.includes('receptionist')) primaryRole = 'receptionist';
                        else if (roles.includes('doctor')) primaryRole = 'doctor';
                        else if (roles.includes('patient')) primaryRole = 'patient';

                        if (primaryRole) {
                            const config = getRoleBadgeConfig(primaryRole);
                            return (
                                <Badge
                                    className={`${config.className} text-[10px] px-2.5 py-0.5 border font-semibold`}
                                >
                                    {config.label}
                                </Badge>
                            );
                        }
                        return null;
                    })()}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={signOut}
                        className="hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0 md:w-auto md:px-3 transition-colors"
                    >
                        <LogOut className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Salir</span>
                    </Button>
                </div>
            </div>
        </header>
    );
};
