import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Users,
    CalendarCheck,
    Banknote,
    Stethoscope
} from 'lucide-react';
import { AdminPatientManager } from './AdminPatientManager';
import { AdminAppointmentBooking } from './AdminAppointmentBooking';
import { AdminPaymentManager } from './AdminPaymentManager';
import { supabase } from '@/integrations/supabase/client';

type Section = 'appointments' | 'payments' | 'patients';

const ReceptionistDashboard = () => {
    const [activeSection, setActiveSection] = useState<Section>('appointments');

    const renderContent = () => {
        switch (activeSection) {
            case 'appointments':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Citas</h2>
                            <p className="text-muted-foreground">Agendamiento y control de consultas médicas.</p>
                        </div>
                        <AdminAppointmentBooking />
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
            case 'patients':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Pacientes</h2>
                            <p className="text-muted-foreground">Administra los expedientes y datos de pacientes.</p>
                        </div>
                        <AdminPatientManager />
                    </div>
                );
            default:
                return null;
        }
    };

    const NavItem = ({ section, label, icon: Icon }: { section: Section; label: string; icon: any }) => (
        <button
            onClick={() => setActiveSection(section)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg ${activeSection === section
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">
            {/* Sidebar */}
            <aside className="w-full md:w-64 shrink-0">
                <div className="sticky top-24 space-y-2">
                    <div className="px-4 py-2 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recepción</h2>
                        <p className="text-xs text-muted-foreground">Panel de Atención</p>
                    </div>

                    <nav className="space-y-1">
                        <NavItem section="appointments" label="Gestión de Citas" icon={CalendarCheck} />
                        <NavItem section="payments" label="Gestión de Cobros" icon={Banknote} />
                        <NavItem section="patients" label="Gestión de Pacientes" icon={Users} />
                    </nav>

                    <div className="px-4 py-4 mt-8 bg-blue-50 rounded-xl mx-2 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Stethoscope className="h-4 w-4 text-blue-600" />
                            <p className="text-xs text-blue-800 font-medium">Información de Médicos</p>
                        </div>
                        <p className="text-xs text-blue-600 leading-relaxed">
                            Para ver disponibilidad detallada, utilice el módulo de "Gestión de Citas" y seleccione un doctor.
                        </p>
                    </div>
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

export default ReceptionistDashboard;
