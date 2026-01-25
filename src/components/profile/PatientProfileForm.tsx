import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, User, Phone, Calendar, Heart, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PatientProfileForm = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Combined form state
    const [formData, setFormData] = useState({
        // Profile table data
        full_name: '',
        phone: '',
        avatar_url: '',

        // Patient Profile table data
        date_of_birth: '',
        gender: '',
        blood_type: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        insurance_provider: '',
        insurance_number: ''
    });

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async () => {
            if (!user) return;

            try {
                // Fetch basic profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (profileError) throw profileError;

                // Fetch patient details
                const { data: patientData, error: patientError } = await supabase
                    .from('patient_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (patientError && patientError.code !== 'PGRST116') throw patientError;

                if (mounted) {
                    setFormData({
                        full_name: profileData?.full_name || '',
                        phone: profileData?.phone || '',
                        avatar_url: profileData?.avatar_url || '',

                        date_of_birth: patientData?.date_of_birth || '',
                        gender: patientData?.gender || '',
                        blood_type: patientData?.blood_type || '',
                        emergency_contact_name: patientData?.emergency_contact_name || '',
                        emergency_contact_phone: patientData?.emergency_contact_phone || '',
                        insurance_provider: patientData?.insurance_provider || '',
                        insurance_number: patientData?.insurance_number || ''
                    });
                }
            } catch (err: any) {
                console.error('Error fetching profile:', err);
                toast.error('No se pudo cargar la información del perfil.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchProfile();

        return () => {
            mounted = false;
        };
    }, [user]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) return;

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user!.id}/${Math.random()}.${fileExt}`;
            setUploading(true);

            // Upload to 'avatars' bucket (assuming it exists, otherwise we might need 'public' or create one)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
            toast.success('Imagen actualizada');

        } catch (error: any) {
            toast.error('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            // Update Base Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    user_id: user.id,
                    full_name: formData.full_name,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url,
                    email: user.email,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (profileError) throw profileError;

            // Update Patient Profile
            const { error: patientError } = await supabase
                .from('patient_profiles')
                .upsert({
                    user_id: user.id,
                    date_of_birth: formData.date_of_birth || null,
                    gender: formData.gender || null,
                    blood_type: formData.blood_type || null,
                    emergency_contact_name: formData.emergency_contact_name || null,
                    emergency_contact_phone: formData.emergency_contact_phone || null,
                    insurance_provider: formData.insurance_provider || null,
                    insurance_number: formData.insurance_number || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (patientError) throw patientError;

            toast.success('Perfil actualizado correctamente');
        } catch (err: any) {
            console.error(err);
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Tu Información Personal
                </CardTitle>
                <CardDescription>
                    Mantén tus datos actualizados para una mejor atención.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Sección de Foto y Datos Básicos */}
                    <div className="flex flex-col md:flex-row gap-8 items-start pb-6 border-b border-gray-100">
                        <div className="flex flex-col items-center space-y-3">
                            <div className="relative group">
                                <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                                    {formData.avatar_url ? (
                                        <img
                                            src={formData.avatar_url}
                                            alt="Avatar"
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://ui.shadcn.com/avatars/04.png';
                                            }}
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                                            <User className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-md cursor-pointer hover:bg-primary/90 transition-colors"
                                >
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    <span className="sr-only">Subir foto</span>
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center max-w-[150px]">
                                Tu foto ayuda a los médicos a identificarte mejor.
                            </p>
                        </div>

                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nombre Completo</Label>
                                <Input
                                    id="fullName"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Tu nombre completo"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono / Celular</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        className="pl-9"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+57 300 123 4567"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="birthDate"
                                        type="date"
                                        className="pl-9"
                                        value={formData.date_of_birth}
                                        onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gender">Género</Label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={val => setFormData({ ...formData, gender: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Hombre">Hombre</SelectItem>
                                        <SelectItem value="Mujer">Mujer</SelectItem>
                                        <SelectItem value="Otro">Otro</SelectItem>
                                        <SelectItem value="Prefiero no decir">Prefiero no decir</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Datos Médicos y de Emergencia */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="font-medium text-sm flex items-center gap-2 text-rose-600">
                                <Heart className="h-4 w-4" />
                                Información de Salud (Opcional)
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bloodType">Tipo de Sangre</Label>
                                    <Select
                                        value={formData.blood_type}
                                        onValueChange={val => setFormData({ ...formData, blood_type: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ej: O+" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="insurance">Aseguradora (EPS/Prepagada)</Label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="insurance"
                                        className="pl-9"
                                        value={formData.insurance_provider}
                                        onChange={e => setFormData({ ...formData, insurance_provider: e.target.value })}
                                        placeholder="Ej: Sura, Sanitas"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-medium text-sm flex items-center gap-2 text-orange-600">
                                <Shield className="h-4 w-4" />
                                Contacto de Emergencia
                            </h4>
                            <div className="space-y-2">
                                <Label htmlFor="emergencyName">Nombre del Contacto</Label>
                                <Input
                                    id="emergencyName"
                                    value={formData.emergency_contact_name}
                                    onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                    placeholder="Nombre de familiar o amigo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emergencyPhone">Teléfono del Contacto</Label>
                                <Input
                                    id="emergencyPhone"
                                    value={formData.emergency_contact_phone}
                                    onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                    placeholder="Número de emergencia"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={saving} size="lg" className="min-w-[150px]">
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar Información
                                </>
                            )}
                        </Button>
                    </div>

                </form>
            </CardContent>
        </Card>
    );
};
