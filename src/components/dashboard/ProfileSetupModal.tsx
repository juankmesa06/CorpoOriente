import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Phone, MapPin, Eye, EyeOff, CheckCircle } from 'lucide-react';

export function ProfileSetupModal() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form fields
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    // Visibility toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        // Check if user needs setup
        // We check for the flag 'setup_required' in metadata
        // OR if they are authenticated but have no password set (hard to detect directly, so we rely on flag)
        if (user && user.user_metadata?.setup_required === true) {
            setIsOpen(true);
        }
    }, [user]);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (!phone) {
            toast.error('El teléfono es obligatorio');
            return;
        }

        setLoading(true);

        try {
            // 1. Update Password and Clear Flag
            const { error: authError } = await supabase.auth.updateUser({
                password: password,
                data: { setup_required: false } // Clear the flag
            });

            if (authError) throw authError;

            // 2. Update Profile
            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        phone: `+57${phone}`,
                        // address: address // Uncomment if column exists
                    })
                    .eq('user_id', user.id);

                if (profileError) {
                    console.error('Error profile:', profileError);
                    toast.warning('Contraseña guardada, pero error en datos de perfil.');
                }
            }

            toast.success('¡Perfil configurado exitosamente!');
            setIsOpen(false);

        } catch (error: any) {
            console.error('Setup error:', error);
            toast.error('Error al configurar perfil: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Prevent closing by clicking outside
    const handleOpenChange = (open: boolean) => {
        if (!open && user?.user_metadata?.setup_required) {
            // Don't allow closing if setup is required
            return;
        }
        setIsOpen(open);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-teal-700 text-center">
                        Bienvenido al Sistema
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Para continuar, por favor configura tu contraseña segura y completa tus datos de contacto.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSetup} className="space-y-4 py-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 border border-blue-200 flex gap-2">
                        <CheckCircle className="h-5 w-5 shrink-0" />
                        <p>Es necesario completar este paso una única vez para activar tu cuenta.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">+57</div>
                            <Input
                                id="phone"
                                placeholder="300 123 4567"
                                className="pl-12"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Dirección (Opcional)</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="address"
                                placeholder="Ciudad, Barrio..."
                                className="pl-9"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Nueva Contraseña</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-9 pr-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-9 pr-10"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Guardando...' : 'Guardar y Continuar'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
