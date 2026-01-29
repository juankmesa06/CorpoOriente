import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle, ShieldAlert, Loader2, KeyRound } from 'lucide-react';

export const StaffSecurityPanel = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success('¡Contraseña actualizada con éxito!', {
                description: 'Ahora puedes usar esta nueva contraseña para tus próximos inicios de sesión.'
            });
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);

            let message = error.message;
            let description = "Ocurrió un error inesperado.";

            if (message.includes('different from the old password')) {
                message = "Contraseña idéntica";
                description = "La nueva contraseña debe ser diferente a la anterior.";
            } else if (message.includes('Password should be at least 8 characters')) {
                message = "Contraseña muy corta";
                description = "Mínimo 8 caracteres.";
            }

            toast.error(message, {
                description: description
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-100 p-2 rounded-lg">
                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Seguridad de la Cuenta</h2>
                    <p className="text-sm text-slate-500">Establece una contraseña segura que solo tú conozcas.</p>
                </div>
            </div>

            <Card className="border-0 shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-teal-600" />
                        <CardTitle className="text-lg">Crear / Cambiar Contraseña</CardTitle>
                    </div>
                    <CardDescription>
                        Como tu cuenta fue creada por el sistema, es importante que definas tu propia clave de acceso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={handleUpdatePassword} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Nueva Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-9 pr-10 h-11 border-slate-200 focus:border-teal-500 rounded-xl"
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
                                    {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                            <div className="relative">
                                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="confirm-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-9 pr-10 h-11 border-slate-200 focus:border-teal-500 rounded-xl"
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
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                                </Button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-600/20 rounded-xl transition-all relative overflow-hidden"
                            disabled={loading}
                        >
                            <span className={`inline-flex items-center gap-2 transition-all duration-200 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                                Establecer Mi Contraseña
                            </span>
                            {loading && (
                                <span className="absolute inset-0 flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-200">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Actualizando...
                                </span>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex gap-3">
                <ShieldAlert className="h-5 w-5 text-teal-600 shrink-0" />
                <div className="text-sm text-teal-800">
                    <p className="font-bold mb-1">Consejo de Seguridad:</p>
                    <p>Usa una combinación de mayúsculas, minúsculas, números y símbolos para que tu cuenta sea más segura.</p>
                </div>
            </div>
        </div>
    );
};
