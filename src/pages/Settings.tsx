import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { DoctorProfileForm } from '@/components/profile/DoctorProfileForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings as SettingsIcon, User } from 'lucide-react';

import { PatientProfileForm } from '@/components/profile/PatientProfileForm';

const Settings = () => {
    const { user, hasRole } = useAuth();

    return (
        <div className="min-h-screen bg-background pb-12">
            <Navbar />
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-primary">
                        <SettingsIcon className="h-8 w-8" />
                        Configuración
                    </h1>
                    <p className="text-muted-foreground">
                        Gestiona tu información personal y preferencias del sistema.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Perfil del Paciente (Edición Completa) */}
                    {hasRole('patient') ? (
                        <PatientProfileForm />
                    ) : (
                        /* Perfil Básico (Lectura para otros roles) */
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Perfil de Usuario
                                </CardTitle>
                                <CardDescription>Información básica de tu cuenta.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-medium">{user?.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Nombre</p>
                                        <p className="font-medium">{user?.user_metadata?.full_name || 'No especificado'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Sección específica para Doctores */}
                    {hasRole('doctor') && (
                        <DoctorProfileForm />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
