import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, LogOut, UserCircle, Settings, Calendar, Heart, LayoutDashboard, Menu, Building2 } from 'lucide-react';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CurrentDateTime } from '@/components/CurrentDateTime';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User } from 'lucide-react';

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
            doctor: { className: 'bg-brand-light text-brand-hover border-brand-light', label: 'Médico' },
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
                flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all duration-200
                ${isActive(to)
                    ? 'text-teal-700 bg-teal-50 font-semibold'
                    : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                }
            `}
        >
            <Icon className={`h-4 w-4 ${isActive(to) ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-600'}`} />
            {label}
        </Link>
    );

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">

                {/* Logo Section */}
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <img
                            src="/logo.png"
                            alt="Centro Psicoterapéutico de Oriente"
                            className="h-10 w-auto object-contain"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1">
                        <NavLink to="/dashboard" icon={LayoutDashboard} label="Panel" />

                        {!hasRole('super_admin') && !hasRole('admin') && !hasRole('receptionist') && (
                            <>
                                <NavLink
                                    to="/appointments"
                                    icon={Calendar}
                                    label={hasRole('doctor') ? "Mi Agenda" : "Mis Citas"}
                                />
                                <NavLink to="/spaces" icon={Building2} label="Espacios" />
                            </>
                        )}
                    </nav>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">

                    {/* User Profile Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-auto pl-2 pr-4 rounded-full hover:bg-slate-100 flex gap-3 items-center">
                                <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                                    {userAvatar ? (
                                        <img src={userAvatar} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-4 w-4 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex flex-col items-start text-sm">
                                    <span className="font-semibold text-slate-700">{userName}</span>
                                    <span className="text-xs text-slate-500 font-normal">
                                        {hasRole('super_admin') ? 'Super Admin' :
                                            hasRole('admin') ? 'Administrador' :
                                                hasRole('doctor') ? 'Médico' :
                                                    hasRole('receptionist') ? 'Recepción' :
                                                        'Paciente'}
                                    </span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{userName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Mi Cuenta</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Cerrar Sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

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
                                            <Link to="/spaces" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50">
                                                <Building2 className="h-5 w-5 text-slate-500" />
                                                <span className="font-medium text-slate-700">Espacios</span>
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
