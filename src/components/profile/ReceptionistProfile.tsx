import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, User, Phone, Mail } from 'lucide-react';

export const ReceptionistProfile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        avatar_url: ''
    });

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, email, phone, avatar_url')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                if (mounted && data) {
                    setFormData({
                        full_name: data.full_name || '',
                        email: data.email || '',
                        phone: (data.phone || '').replace(/^\+57/, ''),
                        avatar_url: data.avatar_url || ''
                    });
                }
            } catch (err: any) {
                console.error('Error fetching profile:', err);
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

            // Try 'avatars' bucket first, fairly standard in Supabase templates
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                // Determine if error is bucket not found or permissions
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData({ ...formData, avatar_url: data.publicUrl });
            toast.success('Imagen subida correctamente');

        } catch (error: any) {
            console.error('Upload Error:', error);
            toast.error('Error al subir la imagen. Asegúrate de que el bucket "avatars" exista.');
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
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: `+57${formData.phone}`,
                    avatar_url: formData.avatar_url,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);

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
                <CardTitle>Mi Perfil de Recepción</CardTitle>
                <CardDescription>
                    Gestiona tu información personal y foto de perfil.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Foto de Perfil */}
                    <div className="space-y-4 border-b pb-6">
                        <Label>Foto de Perfil</Label>
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0">
                                {formData.avatar_url ? (
                                    <div className="relative">
                                        <img
                                            src={formData.avatar_url}
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
                                            onClick={() => setFormData({ ...formData, avatar_url: '' })}
                                        >
                                            <span className="sr-only">Eliminar</span>
                                            <span aria-hidden="true">&times;</span>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                                        <User className="h-8 w-8 text-slate-400" />
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
                                    Esta foto será visible en el sistema.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nombre Completo</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="full_name"
                                    placeholder="Tu nombre completo"
                                    className="pl-9"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono / Celular</Label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">+57</div>
                                <Input
                                    id="phone"
                                    placeholder="300 123 4567"
                                    className="pl-12"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    value={formData.email}
                                    className="pl-9 bg-slate-50"
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">El correo no se puede modificar.</p>
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
