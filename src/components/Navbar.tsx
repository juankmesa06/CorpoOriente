import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, LogOut, UserCircle, Settings, Calendar, FileText, LayoutDashboard } from 'lucide-react';

export const Navbar = () => {
    const { user, roles, signOut, hasRole } = useAuth();
    const navigate = useNavigate();

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'doctor': return 'default';
            case 'receptionist': return 'secondary';
            case 'patient': return 'outline';
            default: return 'outline';
        }
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            admin: 'Administrador',
            doctor: 'Médico',
            receptionist: 'Recepcionista',
            patient: 'Paciente',
        };
        return labels[role] || role;
    };

    return (
        <header className="border-b bg-card py-4 sticky top-0 z-50 backdrop-blur-md bg-card/80">
            <div className="container mx-auto px-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold italic text-primary hidden md:block">Centro PsicoTerapeutico</h1>
                    <h1 className="text-xl font-bold italic text-primary md:hidden text-slate-700">CPTO</h1>
                </Link>

                <nav className="hidden lg:flex items-center gap-6 mx-8">
                    <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </Link>
                    <Link to="/appointments" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                        <Calendar className="h-4 w-4" />
                        {hasRole('patient') ? 'Mis Citas' : 'Agenda'}
                    </Link>
                    {hasRole('patient') && (
                        <Link to="/medical-record" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                            <FileText className="h-4 w-4" />
                            Historial Médico
                        </Link>
                    )}
                    <Link to="/settings" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                        <Settings className="h-4 w-4" />
                        Configuración
                    </Link>
                </nav>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{user?.email?.split('@')[0]}</span>
                    </div>
                    <div className="flex gap-1">
                        {roles.map(role => (
                            <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-[10px] px-2 py-0">
                                {getRoleLabel(role)}
                            </Badge>
                        ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={signOut} className="hover:text-destructive h-9 w-9 p-0 md:w-auto md:px-3">
                        <LogOut className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Salir</span>
                    </Button>
                </div>
            </div>
        </header>
    );
};
