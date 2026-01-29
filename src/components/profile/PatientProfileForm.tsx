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
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-teal-600 h-8 w-8" /></div>;
    }

    return (
        <Card className="border-none shadow-xl bg-white overflow-hidden">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6">
                <div className="flex items-center gap-4 text-white">
                    <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-sm">
                        <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Tu Información Personal</h2>
                        <p className="text-teal-50 text-sm font-medium">Mantén tus datos actualizados para una mejor atención.</p>
                    </div>
                </div>
            </div>

            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Sección de Foto y Datos Básicos */}
                    <div className="flex flex-col lg:flex-row gap-10 items-start pb-8 border-b border-slate-100">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center space-y-4 w-full lg:w-auto">
                            <div className="relative group">
                                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100 ring-2 ring-slate-100">
                                    {formData.avatar_url ? (
                                        <img
                                            src={formData.avatar_url}
                                            alt="Avatar"
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://ui.shadcn.com/avatars/04.png';
                                            }}
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-teal-50 text-teal-300">
                                            <User className="h-12 w-12" />
                                        </div>
                                    )}
                                </div>
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute bottom-1 right-1 p-2.5 bg-teal-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-teal-500 transition-all hover:scale-110"
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
                            <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium text-center max-w-[180px]">
                                Tu foto ayuda a los médicos a identificarte mejor.
                            </div>
                        </div>

                        {/* Basic Info Inputs */}
                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-slate-600 font-semibold text-sm">Nombre Completo</Label>
                                <Input
                                    id="fullName"
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors h-11"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Tu nombre completo"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-slate-600 font-semibold text-sm">Teléfono / Celular</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="phone"
                                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-11"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+57 300 123 4567"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="birthDate" className="text-slate-600 font-semibold text-sm">Fecha de Nacimiento</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="birthDate"
                                        type="date"
                                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-11"
                                        value={formData.date_of_birth}
                                        max={new Date().toISOString().split('T')[0]}
                                        min="1900-01-01"
                                        onChange={e => {
                                            const val = e.target.value;
                                            // Validate year length to prevent 5+ digit years
                                            if (val) {
                                                const year = val.split('-')[0];
                                                if (year.length > 4) return;
                                            }
                                            setFormData({ ...formData, date_of_birth: val });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gender" className="text-slate-600 font-semibold text-sm">Género</Label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={val => setFormData({ ...formData, gender: val })}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-200 h-11">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-5">
                            <h4 className="font-bold text-base flex items-center gap-2 text-rose-600 bg-rose-50 p-2.5 rounded-lg w-fit pr-4">
                                <Heart className="h-5 w-5" />
                                Información de Salud (Opcional)
                            </h4>
                            <div className="space-y-5 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <div className="space-y-2">
                                    <Label htmlFor="bloodType" className="text-slate-600 font-medium">Tipo de Sangre</Label>
                                    <Select
                                        value={formData.blood_type}
                                        onValueChange={val => setFormData({ ...formData, blood_type: val })}
                                    >
                                        <SelectTrigger className="bg-white border-slate-200 h-11">
                                            <SelectValue placeholder="Ej: O+" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="insurance" className="text-slate-600 font-medium">Aseguradora (EPS/Prepagada)</Label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="insurance"
                                            className="pl-10 bg-white border-slate-200 h-11"
                                            value={formData.insurance_provider}
                                            onChange={e => setFormData({ ...formData, insurance_provider: e.target.value })}
                                            placeholder="Ej: Sura, Sanitas"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <h4 className="font-bold text-base flex items-center gap-2 text-orange-600 bg-orange-50 p-2.5 rounded-lg w-fit pr-4">
                                <Shield className="h-5 w-5" />
                                Contacto de Emergencia
                            </h4>
                            <div className="space-y-5 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <div className="space-y-2">
                                    <Label htmlFor="emergencyName" className="text-slate-600 font-medium">Nombre del Contacto</Label>
                                    <Input
                                        id="emergencyName"
                                        className="bg-white border-slate-200 h-11"
                                        value={formData.emergency_contact_name}
                                        onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                        placeholder="Nombre de familiar o amigo"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergencyPhone" className="text-slate-600 font-medium">Teléfono del Contacto</Label>
                                    <Input
                                        id="emergencyPhone"
                                        className="bg-white border-slate-200 h-11"
                                        value={formData.emergency_contact_phone}
                                        onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                        placeholder="Número de emergencia"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-slate-100">
                        <Button
                            type="submit"
                            disabled={saving}
                            size="lg"
                            className="bg-teal-600 hover:bg-teal-700 text-white min-w-[200px] h-12 text-base shadow-lg shadow-teal-700/20 rounded-xl"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-5 w-5" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </div>

                </form>
            </CardContent>
        </Card>
    );
};
