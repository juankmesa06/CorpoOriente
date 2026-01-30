import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, Mail, ArrowRight, Loader2, Phone, MapPin } from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState<string | null>(null);

    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setEmail(session.user.email || null);

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('phone, address')
                    .eq('user_id', session.user.id)
                    .single();

                if (profileData) {
                    const profile = profileData as any;
                    if (profile.phone) setPhone(profile.phone.replace(/^\+57/, ''));
                    if (profile.address) setAddress(profile.address || '');
                }
            }
        };
        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                if (session?.user?.email) setEmail(session.user.email);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
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
            const { error: authError } = await supabase.auth.updateUser({
                password: password
            });

            if (authError) throw authError;

            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        phone: `+57${phone}`,
                        address: address
                    })
                    .eq('user_id', user.id);

                if (profileError) {
                    console.error('Error updating profile:', profileError);
                    toast.warning('Contraseña guardada, pero hubo un problema con tus datos personales.');
                }
            }

            toast.success('Cuenta configurada con éxito');
            navigate('/dashboard');

        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error('Error al actualizar contraseña', {
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <PublicNavbar />

            <main className="flex-grow flex items-center justify-center p-4 pt-24 pb-12 relative overflow-hidden">
                {/* Background Decorative Elements */}
                <div className="absolute top-1/4 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <Card className="w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-0 overflow-hidden relative z-10 backdrop-blur-sm bg-white/95">
                    {/* Header with gradient */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-center text-white relative">
                        <div className="absolute inset-0 bg-white/5 skew-x-12 transform translate-x-12" />
                        <div className="bg-white p-2 rounded-2xl w-fit mx-auto mb-3 shadow-lg border border-teal-100 relative z-10">
                            <img
                                src="/logo.png"
                                alt="Centro Psicoterapéutico de Oriente"
                                className="h-14 w-auto object-contain"
                            />
                        </div>
                        <CardTitle className="text-xl font-bold relative z-10 uppercase tracking-tight">Recuperar Acceso</CardTitle>
                        <CardDescription className="text-teal-50/90 relative z-10">
                            Establece tu nueva contraseña y completa tus datos
                        </CardDescription>
                    </div>

                    <CardContent className="p-8">
                        {email && (
                            <div className="mb-6 bg-teal-50/50 p-4 rounded-xl border border-teal-100 flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg shadow-sm border border-teal-100">
                                    <Mail className="h-4 w-4 text-teal-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Usuario en recuperación</p>
                                    <p className="text-sm font-bold text-teal-900">{email}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">Teléfono</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">+57</div>
                                        <Input
                                            id="phone"
                                            placeholder="300 123 4567"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            className="pl-12 h-11 border-slate-200 rounded-xl focus:border-teal-500 bg-slate-50/50"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-sm font-semibold text-slate-700">Dirección</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="address"
                                            placeholder="Ciudad, Estado"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="pl-9 h-11 border-slate-200 rounded-xl focus:border-teal-500 bg-slate-50/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" dangerouslySetInnerHTML={{ __html: 'Nueva Contraseña' }} className="text-sm font-semibold text-slate-700" />
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-9 pr-10 h-11 border-slate-200 rounded-xl focus:border-teal-500 bg-slate-50/50"
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
                                <Label htmlFor="confirmPassword" dangerouslySetInnerHTML={{ __html: 'Confirmar Contraseña' }} className="text-sm font-semibold text-slate-700" />
                                <div className="relative">
                                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-9 pr-10 h-11 border-slate-200 rounded-xl focus:border-teal-500 bg-slate-50/50"
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
                                className="w-full h-12 text-base font-bold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-xl shadow-teal-700/20 text-white rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        Actualizar Contraseña
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default ResetPassword;
