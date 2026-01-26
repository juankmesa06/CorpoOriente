import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Building2,
    Users,
    CreditCard,
    Stethoscope,
    Settings,
    Wallet,
    CalendarCheck,
    Banknote,
    TrendingUp,
    DollarSign,
    UserCheck,
    ChevronRight
} from 'lucide-react';
import { RoomManagement } from './RoomManagement';
import { DoctorAffiliationManager } from './DoctorAffiliationManager';
import { AdminPatientManager } from './AdminPatientManager';
import { AdminRoleManager } from './AdminRoleManager';
import { AdminOrganizationConfig } from './AdminOrganizationConfig';
import { AdminAccountingReports } from './AdminAccountingReports';
import { AdminAppointmentBooking } from './AdminAppointmentBooking';
import { AdminPaymentManager } from './AdminPaymentManager';
import { supabase } from '@/integrations/supabase/client';

type Section = 'spaces' | 'appointments' | 'payments' | 'doctor-billing' | 'users' | 'settings-roles' | 'settings-org' | 'settings-accounting';

const AdminDashboard = () => {
    const [activeSection, setActiveSection] = useState<Section>('spaces');
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [userName, setUserName] = useState('Administrador');
    const [stats, setStats] = useState({ rooms: 0, doctors: 0, patients: 0, revenue: 0 });

    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: roles } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id);

                const hasSuperAdmin = roles?.some(r => (r.role as string) === 'super_admin');
                setIsSuperAdmin(!!hasSuperAdmin);

                // Set role-based name instead of personal name
                if (hasSuperAdmin) {
                    setUserName('Super Administrador');
                } else {
                    setUserName('Administrador');
                }

                // Get stats
                const { count: roomCount } = await supabase
                    .from('rooms')
                    .select('*', { count: 'exact', head: true });

                const { count: doctorCount } = await supabase
                    .from('doctor_profiles')
                    .select('*', { count: 'exact', head: true });

                const { count: patientCount } = await supabase
                    .from('patient_profiles')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    rooms: roomCount || 0,
                    doctors: doctorCount || 0,
                    patients: patientCount || 0,
                    revenue: 0 // TODO: Calculate from payments
                });
            }
        };
        checkRole();
    }, []);

    const renderContent = () => {
        switch (activeSection) {
            case 'spaces':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Centro de Control</h2>
                            <p className="text-slate-600">Administra espacios, monitorea ocupación y gestiona citas desde un solo lugar.</p>
                        </div>
                        <RoomManagement />
                    </div>
                );
            case 'payments':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Cobros</h2>
                            <p className="text-slate-600">Historial de pagos y registro de ingresos.</p>
                        </div>
                        <AdminPaymentManager />
                    </div>
                );
            case 'doctor-billing':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Médicos</h2>
                            <p className="text-slate-600">Gestiona las membresías de especialistas y el uso de espacios.</p>
                        </div>
                        <DoctorAffiliationManager />
                    </div>
                );
            case 'users':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Pacientes</h2>
                            <p className="text-slate-600">Administra los expedientes y datos de pacientes.</p>
                        </div>
                        <AdminPatientManager />
                    </div>
                );
            case 'settings-roles':
                if (!isSuperAdmin) return null;
                return <AdminRoleManager />;
            case 'settings-org':
                if (!isSuperAdmin) return null;
                return <AdminOrganizationConfig />;
            case 'settings-accounting':
                if (!isSuperAdmin) return null;
                return <AdminAccountingReports />;
            default:
                return null;
        }
    };

    const NavItem = ({ section, label, icon: Icon, subItem = false }: { section: Section; label: string; icon: any; subItem?: boolean }) => (
        <button
            onClick={() => setActiveSection(section)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-xl group ${activeSection === section
                ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-600/30'
                : 'text-slate-700 hover:bg-slate-100'
                } ${subItem ? 'pl-11 text-xs py-2' : ''}`}
        >
            {!subItem && <Icon className={`h-5 w-5 ${activeSection === section ? 'text-white' : 'text-slate-500 group-hover:text-teal-600'}`} />}
            <span className="flex-1 text-left">{label}</span>
            {!subItem && activeSection === section && <ChevronRight className="h-4 w-4" />}
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">¡Bienvenido, {userName}!</h1>
                        <p className="text-teal-100">
                            {isSuperAdmin ? 'Panel de Super Administrador' : 'Panel de Control del Sistema'}
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                            <Settings className="h-10 w-10 text-white" />
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.rooms}</p>
                                <p className="text-xs text-teal-100">Espacios</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <Stethoscope className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.doctors}</p>
                                <p className="text-xs text-teal-100">Médicos</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.patients}</p>
                                <p className="text-xs text-teal-100">Pacientes</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">95%</p>
                                <p className="text-xs text-teal-100">Ocupación</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <aside className="w-full lg:w-72 shrink-0">
                    <Card className="border-0 shadow-xl sticky top-24">
                        <CardHeader className="border-b bg-slate-50">
                            <CardTitle className="text-lg">Administración</CardTitle>
                            <CardDescription>
                                {isSuperAdmin ? 'Acceso completo al sistema' : 'Panel de control'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <nav className="space-y-2">
                                <NavItem section="spaces" label="Centro de Control" icon={Building2} />
                                <NavItem section="payments" label="Gestión de Cobros" icon={Banknote} />
                                <NavItem section="doctor-billing" label="Gestión de Médicos" icon={Stethoscope} />
                                <NavItem section="users" label="Gestión de Pacientes" icon={Users} />

                                {isSuperAdmin && (
                                    <div className="pt-4 border-t mt-4">
                                        <button
                                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Settings className="h-5 w-5 text-slate-500" />
                                                <span>Configuración</span>
                                            </div>
                                            <ChevronRight className={`h-4 w-4 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`} />
                                        </button>

                                        {isSettingsOpen && (
                                            <div className="mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                                <NavItem section="settings-roles" label="Roles y Permisos" icon={null} subItem />
                                                <NavItem section="settings-org" label="Organización" icon={null} subItem />
                                                <NavItem section="settings-accounting" label="Reportes Contables" icon={null} subItem />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </nav>
                        </CardContent>
                    </Card>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    <Card className="border-0 shadow-xl">
                        <CardContent className="p-8">
                            {renderContent()}
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
