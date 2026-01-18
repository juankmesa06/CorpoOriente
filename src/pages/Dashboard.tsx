import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Import split dashboard components
import PatientDashboard from '@/components/dashboard/PatientDashboard';
import DoctorDashboard from '@/components/dashboard/DoctorDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import ReceptionistDashboard from '@/components/dashboard/ReceptionistDashboard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Dashboard() {
  const { user, roles, signOut, hasRole } = useAuth();
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (user && hasRole('doctor')) {
        const { data } = await supabase
          .from('doctor_profiles')
          .select('bio, specialty')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setIsProfileIncomplete(!data.bio || data.specialty === 'General');
        } else {
          setIsProfileIncomplete(true);
        }
      }
    };
    checkProfile();
  }, [user, roles]);

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
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 tracking-tight">¡Bienvenido, {user?.email?.split('@')[0]}!</h2>
          <p className="text-muted-foreground text-lg">
            {hasRole('patient') && !hasRole('doctor') && !hasRole('admin')
              ? "Gestiona tus citas y bienestar emocional."
              : "Panel de control del sistema de gestión psicoterapéutica."}
          </p>
        </div>

        {/* Dynamic Content based on Role */}
        {hasRole('admin') ? (
          <AdminDashboard />
        ) : hasRole('doctor') ? (
          <DoctorDashboard isProfileIncomplete={isProfileIncomplete} />
        ) : hasRole('receptionist') ? (
          <ReceptionistDashboard />
        ) : hasRole('patient') ? (
          <PatientDashboard />
        ) : (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Cuenta pendiente de activación</CardTitle>
              <CardDescription>
                Tu cuenta ha sido creada pero aún no tienes un rol asignado.
                Contacta al administrador para que te asigne los permisos correspondientes.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
}
