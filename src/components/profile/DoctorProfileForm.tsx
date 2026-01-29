import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

export const DoctorProfileForm = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        specialty: '',
        license_number: '',
        bio: '',
        consultation_duration_min: 60,
        consultation_fee: 0,
        education: '',
        photo_url: '',
        bank_name: '',
        account_number: '',
        account_type: 'Ahorros'
    });

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async () => {
            if (!user) {
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('doctor_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                if (mounted && data) {
                    setFormData({
                        specialty: data.specialty || '',
                        license_number: data.license_number || '',
                        bio: data.bio || '',
                        consultation_duration_min: data.consultation_duration_min || 60,
                        consultation_fee: data.consultation_fee || 0,
                        education: data.education || '',
                        photo_url: data.photo_url || '',
                        bank_name: data.bank_name || '',
                        account_number: data.account_number || '',
                        account_type: data.account_type || 'Ahorros'
                    });
                }
            } catch (err: any) {
                console.error('Error fetching doctor profile:', err);
                if (mounted) {
                    toast.error('No se pudo cargar la información del perfil.');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchProfile();

        return () => {
            mounted = false;
        };
    }, [user]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) {
                return;
            }
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user!.id}/${Math.random()}.${fileExt}`;
            setUploading(true);

            const { error: uploadError } = await supabase.storage
                .from('doctor-profiles')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('doctor-profiles')
                .getPublicUrl(filePath);

            setFormData({ ...formData, photo_url: data.publicUrl });
            toast.success('Imagen subida correctamente');

        } catch (error: any) {
            toast.error('Error al subir la imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('doctor_profiles')
                .upsert({
                    user_id: user.id,
                    specialty: formData.specialty,
                    license_number: formData.license_number,
                    bio: formData.bio,
                    consultation_duration_min: formData.consultation_duration_min,
                    consultation_fee: formData.consultation_fee,
                    education: formData.education,
                    photo_url: formData.photo_url,
                    bank_name: formData.bank_name,
                    account_number: formData.account_number,
                    account_type: formData.account_type,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            if (error) throw error;
            toast.success('Perfil actualizado correctamente');
        } catch (err: any) {
            toast.error('Error al actualizar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Información Profesional</CardTitle>
                <CardDescription>
                    Esta información será visible para los pacientes al momento de agendar una cita.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Foto de Perfil */}
                    <div className="space-y-4 border-b pb-6">
                        <Label>Foto de Perfil</Label>
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0">
                                {formData.photo_url ? (
                                    <div className="relative">
                                        <img
                                            src={formData.photo_url}
                                            alt="Profile"
                                            className="h-24 w-24 rounded-full object-cover border-2 border-primary/10"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://ui.shadcn.com/avatars/01.png';
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={() => setFormData({ ...formData, photo_url: '' })}
                                        >
                                            <span className="sr-only">Eliminar</span>
                                            <span aria-hidden="true">&times;</span>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                                        <Loader2 className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow space-y-2">
                                <Label htmlFor="photo_upload" className="cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" disabled={uploading} onClick={() => document.getElementById('photo_upload')?.click()}>
                                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {uploading ? 'Subiendo...' : 'Subir Foto'}
                                        </Button>
                                    </div>
                                    <Input
                                        id="photo_upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Sube una foto profesional (JPG, PNG). Máximo 2MB.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="specialty">Especialidad</Label>
                            <Input
                                id="specialty"
                                placeholder="Ej: Psicoterapeuta Infantil"
                                value={formData.specialty}
                                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="license_number">Número de Licencia / Colegiado</Label>
                            <Input
                                id="license_number"
                                placeholder="Nº 12345"
                                value={formData.license_number}
                                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="education">Formación Académica / Universidad</Label>
                        <Input
                            id="education"
                            placeholder="Ej: Universidad de Antioquia - Psicología Clínica (2015)"
                            value={formData.education}
                            onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Indica tu universidad y título obtenido para generar mayor confianza.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Biografía Profesional</Label>
                        <Textarea
                            id="bio"
                            placeholder="Cuéntale a tus pacientes sobre tu experiencia y enfoque..."
                            rows={4}
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duración de Consulta (minutos)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={60}
                                disabled
                                className="bg-slate-50 cursor-not-allowed opacity-70"
                            />
                            <p className="text-[10px] text-muted-foreground font-medium">
                                Duración fija de 1 hora por política de reserva de consultorios.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fee">Valor Consulta (COP)</Label>
                            <Input
                                id="fee"
                                type="number"
                                placeholder="Ej: 150000"
                                value={formData.consultation_fee}
                                onChange={(e) => setFormData({ ...formData, consultation_fee: parseFloat(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Costo por sesión para pacientes particulares.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Información para Pagos (Lunes)</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            Ingresa tus datos bancarios para que la administración pueda transferir tus honorarios semanalmente.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bank_name">Banco</Label>
                                <Input
                                    id="bank_name"
                                    placeholder="Ej: Bancolombia, Davivienda"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="account_type">Tipo de Cuenta</Label>
                                <select
                                    id="account_type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.account_type}
                                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                                >
                                    <option value="Ahorros">Ahorros</option>
                                    <option value="Corriente">Corriente</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="account_number">Número de Cuenta</Label>
                                <Input
                                    id="account_number"
                                    placeholder="000-000000-00"
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <Button type="submit" className="w-full md:w-auto" disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
