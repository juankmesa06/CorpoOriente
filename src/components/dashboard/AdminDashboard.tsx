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
    ChevronRight,
    KeyRound,
    Menu,
    X
} from 'lucide-react';
import { RoomManagement } from './RoomManagement';
import { DoctorAffiliationManager } from './DoctorAffiliationManager';
import { AdminPatientManager } from './AdminPatientManager';
import { AdminRoleManager } from './AdminRoleManager';
import { AdminOrganizationConfig } from './AdminOrganizationConfig';
import { AdminAccountingReports } from './AdminAccountingReports';
import { AdminAppointmentBooking } from './AdminAppointmentBooking';
import { AdminPaymentManager } from './AdminPaymentManager';
import { UserManagementPanel } from './UserManagementPanel';
import { StaffSecurityPanel } from './StaffSecurityPanel';
import { supabase } from '@/integrations/supabase/client';

type Section = 'spaces' | 'appointments' | 'payments' | 'doctor-billing' | 'users' | 'user-management' | 'settings-roles' | 'settings-org' | 'settings-accounting' | 'security';

const AdminDashboard = () => {
    const [activeSection, setActiveSection] = useState<Section>('spaces');
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [userName, setUserName] = useState('Administrador');
    const [stats, setStats] = useState({ rooms: 0, doctors: 0, patients: 0, availableRooms: 0, revenue: 0 });

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

                // Calculate available rooms (Total - Occupied Now)
                const now = new Date().toISOString();

                // Get occupied rooms by appointments
                const { data: occupiedByApts } = await supabase
                    .from('appointments')
                    .select('room_id')
                    .lte('start_time', now)
                    .gte('end_time', now)
                    .not('room_id', 'is', null);

                // Get occupied rooms by rentals
                const { data: occupiedByRentals } = await supabase
                    .from('room_rentals' as any)
                    .select('room_id')
                    .lte('start_time', now)
                    .gte('end_time', now);

                const occupiedIds = new Set([
                    ...(occupiedByApts?.map((a: any) => a.room_id) || []),
                    ...(occupiedByRentals?.map((r: any) => r.room_id) || [])
                ]);

                const totalRooms = roomCount || 0;
                const available = Math.max(0, totalRooms - occupiedIds.size);

                // Calculate total revenue
                const { data: paymentsData } = await supabase
                    .from('payments')
                    .select('amount')
                    .eq('status', 'paid');

                const totalRevenue = paymentsData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

                setStats({
                    rooms: totalRooms,
                    doctors: doctorCount || 0,
                    patients: patientCount || 0,
                    availableRooms: available,
                    revenue: totalRevenue
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
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Centro de control</h2>
                            <p className="text-slate-600">Administra espacios, monitorea ocupación y gestiona citas desde un solo lugar.</p>
                        </div>
                        <RoomManagement />
                    </div>
                );
            case 'payments':
                return (
                    <div className="space-y-6">

                        <AdminPaymentManager />
                    </div>
                );
            case 'doctor-billing':
                return <DoctorAffiliationManager />;
            case 'users':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de pacientes</h2>
                            <p className="text-slate-600">Administra los expedientes y datos de pacientes.</p>
                        </div>
                        <AdminPatientManager />
                    </div>
                );

            case 'user-management':
                if (!isSuperAdmin) return null;
                return <UserManagementPanel />;
            case 'settings-roles':
                if (!isSuperAdmin) return null;
                return <AdminRoleManager />;
            case 'settings-org':
                if (!isSuperAdmin) return null;
                return <AdminOrganizationConfig />;
            case 'settings-accounting':
                if (!isSuperAdmin) return null;
                return <AdminAccountingReports />;
            case 'security':
                return <StaffSecurityPanel />;
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
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-white">
                            <p className="text-2xl font-bold">{stats.rooms}</p>
                            <p className="text-xs text-teal-100">Espacios</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Stethoscope className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-white">
                            <p className="text-2xl font-bold">{stats.doctors}</p>
                            <p className="text-xs text-teal-100">Médicos</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-white">
                            <p className="text-2xl font-bold">${(stats.revenue || 0).toLocaleString()}</p>
                            <p className="text-xs text-teal-100">Ingresos Totales (Pagados)</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <CalendarCheck className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-white">
                            <p className="text-2xl font-bold">{stats.availableRooms}</p>
                            <p className="text-xs text-teal-100">Disponibles</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Mobile Menu Toggle */}
                <div className="lg:hidden mb-4">
                    <Button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="w-full flex items-center justify-between bg-slate-800 text-white"
                    >
                        <span className="flex items-center gap-2">
                            <Menu className="h-5 w-5" />
                            Menú de Administración
                        </span>
                        {isMobileMenuOpen ? <ChevronRight className="rotate-90 transition-transform" /> : <ChevronRight className="transition-transform" />}
                    </Button>
                </div>
                {/* Sidebar */}
                <aside className={`
                    w-full lg:w-72 shrink-0 transition-all duration-300
                    ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}
                `}>
                    <Card className="border-0 shadow-xl sticky top-24">
                        <CardHeader className="border-b bg-slate-50 flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg">Administración</CardTitle>
                                <CardDescription>
                                    {isSuperAdmin ? 'Acceso completo al sistema' : 'Panel de control'}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4">
                            <nav className="space-y-2">
                                <NavItem section="spaces" label="Centro de control" icon={Building2} />
                                <NavItem section="payments" label="Gestión de cobros" icon={Banknote} />
                                <NavItem section="doctor-billing" label="Gestión de médicos" icon={Stethoscope} />
                                <NavItem section="users" label="Gestión de pacientes" icon={Users} />

                                {isSuperAdmin && (
                                    <NavItem section="user-management" label="Crear usuarios admin" icon={Users} />
                                )}

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
                                                <NavItem section="settings-roles" label="Roles y permisos" icon={null} subItem />
                                                <NavItem section="settings-org" label="Organización" icon={null} subItem />
                                                <NavItem section="settings-accounting" label="Reportes contables" icon={null} subItem />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 border-t mt-4">
                                    <NavItem section="security" label="Crear contraseña" icon={KeyRound} />
                                </div>
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
