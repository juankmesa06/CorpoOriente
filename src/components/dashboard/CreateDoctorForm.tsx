import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateDoctorFormProps {
    onSuccess?: () => void;
}

export const CreateDoctorForm = ({ onSuccess }: CreateDoctorFormProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        specialty: '',
        license_number: '',
        phone: '',
        bio: '',
        consultation_fee: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('create_doctor_user', {
                body: {
                    email: formData.email,
                    full_name: formData.full_name,
                    specialty: formData.specialty,
                    license_number: formData.license_number || undefined,
                    phone: formData.phone ? `+57${formData.phone}` : undefined,
                    bio: formData.bio || undefined,
                    consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : undefined
                }
            });

            if (error) {
                console.error('Error creating doctor:', error);
                toast.error('Error al crear médico', {
                    description: error.message || 'No se pudo crear el médico'
                });
                return;
            }

            toast.success('¡Médico creado exitosamente!', {
                description: `Se ha enviado un correo a ${formData.email} para configurar su contraseña.`
            });

            // Reset form
            setFormData({
                email: '',
                full_name: '',
                specialty: '',
                license_number: '',
                phone: '',
                bio: '',
                consultation_fee: ''
            });

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }

        } catch (error: any) {
            console.error('Error:', error);
            toast.error('Error inesperado', {
                description: error.message || 'Ocurrió un error al crear el médico'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Información del Médico
                    </CardTitle>
                    <CardDescription>
                        Los campos marcados con * son obligatorios
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="doctor@example.com"
                                />
                            </div>

                            {/* Nombre completo */}
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nombre Completo *</Label>
                                <Input
                                    id="full_name"
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Dr. Juan Pérez"
                                />
                            </div>

                            {/* Especialidad */}
                            <div className="space-y-2">
                                <Label htmlFor="specialty">Especialidad *</Label>
                                <Input
                                    id="specialty"
                                    type="text"
                                    required
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    placeholder="Cardiología"
                                />
                            </div>

                            {/* Número de licencia */}
                            <div className="space-y-2">
                                <Label htmlFor="license_number">Número de Licencia</Label>
                                <Input
                                    id="license_number"
                                    type="text"
                                    value={formData.license_number}
                                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                                    placeholder="MED-12345"
                                />
                            </div>

                            {/* Teléfono */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono / WhatsApp (+57)</Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">+57</div>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        className="pl-12"
                                        placeholder="300 123 4567"
                                    />
                                </div>
                            </div>

                            {/* Tarifa de consulta */}
                            <div className="space-y-2">
                                <Label htmlFor="consultation_fee">Tarifa de Consulta (COP)</Label>
                                <Input
                                    id="consultation_fee"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={formData.consultation_fee}
                                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                                    placeholder="150000"
                                />
                            </div>
                        </div>

                        {/* Biografía */}
                        <div className="space-y-2">
                            <Label htmlFor="bio">Biografía / Descripción</Label>
                            <Textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder="Médico especialista con 10 años de experiencia..."
                                rows={4}
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando médico...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Crear Médico
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-900">Información importante</p>
                            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                                <li>El médico recibirá un correo electrónico para configurar su contraseña</li>
                                <li>La cuenta se creará con el rol "doctor" automáticamente</li>
                                <li>El médico podrá actualizar su perfil después del primer login</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
