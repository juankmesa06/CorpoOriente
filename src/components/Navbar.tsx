import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, LogOut, UserCircle, Settings, Calendar, Heart, LayoutDashboard, Menu } from 'lucide-react';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CurrentDateTime } from '@/components/CurrentDateTime';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const Navbar = () => {
    const { user, roles, signOut, hasRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [userName, setUserName] = useState<string>('');
    const [userAvatar, setUserAvatar] = useState<string>('');

    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                // 1. Fetch base profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('user_id', user.id)
                    .maybeSingle();

                let currentName = 'Usuario';
                let currentAvatar = '';

                if (profile) {
                    if (profile.full_name) currentName = profile.full_name;
                    if (profile.avatar_url) currentAvatar = profile.avatar_url;
                }

                // 2. If Doctor, fetch doctor profile for specific photo if available
                if (hasRole('doctor')) {
                    const { data: doctorProfile } = await supabase
                        .from('doctor_profiles')
                        .select('photo_url')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (doctorProfile?.photo_url) {
                        currentAvatar = doctorProfile.photo_url;
                    }
                }

                setUserName(currentName);
                setUserAvatar(currentAvatar);
            }
        };
        fetchUserData();
    }, [user, roles, hasRole]);

    const getRoleBadgeConfig = (role: string) => {
        const configs: Record<string, { className: string; label: string }> = {
            admin: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Admin' },
            super_admin: { className: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Super Admin' },
            doctor: { className: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Médico' },
            receptionist: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Recepción' },
            patient: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Paciente' },
        };
        return configs[role] || configs.patient;
    };

    const isActive = (path: string) => location.pathname === path;

    const NavLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
        <Link
            to={to}
            className={`
                flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all duration-200 group
                ${isActive(to)
                    ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100'
                    : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                }
            `}
        >
            <Icon className={`h-4 w-4 ${isActive(to) ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-500'}`} />
            {label}
        </Link>
    );

    return (
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm h-20">
            <div className="container mx-auto px-4 h-full flex items-center justify-between">

                {/* Logo Section */}
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <img
                            src="/logo.png"
                            alt="Centro Psicoterapéutico de Oriente"
                            className="h-12 w-auto object-contain"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1 bg-slate-50/50 p-1 rounded-full border border-slate-200/50">
                        <NavLink to="/dashboard" icon={LayoutDashboard} label="Panel Principal" />

                        {!hasRole('super_admin') && !hasRole('admin') && !hasRole('receptionist') && (
                            <>
                                <NavLink
                                    to="/appointments"
                                    icon={Calendar}
                                    label={hasRole('doctor') ? "Mi Agenda" : "Mis Citas"}
                                />
                                <NavLink to="/settings" icon={Settings} label="Mi Cuenta" />
                            </>
                        )}
                    </nav>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-6">
                    {/* Date - Hidden on small screens */}
                    <div className="hidden xl:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <CurrentDateTime />
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
                        <div className="hidden md:flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-800 leading-tight">
                                    {hasRole('super_admin') ? 'Super Admin' :
                                        hasRole('admin') ? 'Administrador' :
                                            userName}
                                </span>
                            </div>

                            {/* Role Badge - Now side-by-side or distinct */}
                            {(() => {
                                let primaryRole = 'patient';
                                if (hasRole('super_admin')) primaryRole = 'super_admin';
                                else if (hasRole('admin')) primaryRole = 'admin';
                                else if (hasRole('doctor')) primaryRole = 'doctor';
                                else if (hasRole('receptionist')) primaryRole = 'receptionist';

                                const config = getRoleBadgeConfig(primaryRole);
                                return (
                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold tracking-wide uppercase ${config.className} border`}>
                                        {config.label}
                                    </span>
                                );
                            })()}
                        </div>

                        <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center overflow-hidden">
                            {userAvatar ? (
                                <img src={userAvatar} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <UserCircle className="h-6 w-6 text-slate-400" />
                            )}
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={signOut}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-1"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Mobile Menu Trigger */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-6 w-6 text-slate-600" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <div className="flex flex-col gap-4 mt-8">
                                    <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50">
                                        <LayoutDashboard className="h-5 w-5 text-slate-500" />
                                        <span className="font-medium text-slate-700">Panel Principal</span>
                                    </Link>
                                    {!roles.includes('super_admin') && !roles.includes('admin') && (
                                        <>
                                            <Link to="/appointments" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50">
                                                <Calendar className="h-5 w-5 text-slate-500" />
                                                <span className="font-medium text-slate-700">
                                                    {hasRole('patient') ? 'Mis Citas' : hasRole('doctor') ? 'Mi Agenda' : 'Citas'}
                                                </span>
                                            </Link>
                                            <Link to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50">
                                                <Settings className="h-5 w-5 text-slate-500" />
                                                <span className="font-medium text-slate-700">Configuración</span>
                                            </Link>
                                        </>
                                    )}
                                    <Button onClick={signOut} variant="destructive" className="mt-4 w-full">
                                        <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header >
    );
};
