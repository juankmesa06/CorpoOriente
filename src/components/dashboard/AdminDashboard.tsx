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
    Banknote
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
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Centro de Control</h2>
                            <p className="text-muted-foreground">Administra espacios, monitorea ocupación y gestiona citas desde un solo lugar.</p>
                        </div>
                        <RoomManagement />
                    </div>
                );
            case 'payments':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Cobros</h2>
                            <p className="text-muted-foreground">Historial de pagos y registro de ingresos.</p>
                        </div>
                        <AdminPaymentManager />
                    </div>
                );
            case 'doctor-billing':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Médicos</h2>
                            <p className="text-muted-foreground">Gestiona las membresías de especialistas y el uso de espacios.</p>
                        </div>
                        <DoctorAffiliationManager />
                    </div>
                );
            case 'users':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Pacientes</h2>
                            <p className="text-muted-foreground">Administra los expedientes y datos de pacientes.</p>
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
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors rounded-lg ${activeSection === section
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-gray-100 hover:text-gray-900'
                } ${subItem ? 'pl-11 text-xs' : ''}`}
        >
            {!subItem && <Icon className="h-4 w-4" />}
            {label}
        </button>
    );

    return (
        <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">
            {/* Sidebar */}
            <aside className="w-full md:w-64 shrink-0">
                <div className="sticky top-24 space-y-2">
                    <div className="px-4 py-2 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Administración</h2>
                        <p className="text-xs text-muted-foreground">
                            {isSuperAdmin ? 'Super Admin' : 'Panel de Control'}
                        </p>
                    </div>

                    <nav className="space-y-1">
                        <NavItem section="spaces" label="Centro de Control" icon={Building2} />
                        <NavItem section="payments" label="Gestión de Cobros" icon={Banknote} />
                        <NavItem section="doctor-billing" label="Gestión de Médicos" icon={Stethoscope} />
                        <NavItem section="users" label="Gestión de Pacientes" icon={Users} />

                        {isSuperAdmin && (
                            <div className="pt-2">
                                <button
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Settings className="h-4 w-4" />
                                        <span>Configuración</span>
                                    </div>
                                </button>

                                {isSettingsOpen && (
                                    <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        <NavItem section="settings-roles" label="Roles y Permisos" icon={null} subItem />
                                        <NavItem section="settings-org" label="Organización" icon={null} subItem />
                                        <NavItem section="settings-accounting" label="Reportes Contables" icon={null} subItem />
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-full">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
