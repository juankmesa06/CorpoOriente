import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, CheckCircle, Eye, EyeOff, Mail, ArrowRight, Loader2, Phone, MapPin, UserCheck, Shield } from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { Badge } from '@/components/ui/badge';

const SetupPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [email, setEmail] = useState<string | null>(null);
    const [fullName, setFullName] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    // Password validation states
    const [passwordValidation, setPasswordValidation] = useState({
        minLength: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecial: false,
    });

    useEffect(() => {
        const validatePassword = (pwd: string) => {
            setPasswordValidation({
                minLength: pwd.length >= 8,
                hasUppercase: /[A-Z]/.test(pwd),
                hasNumber: /[0-9]/.test(pwd),
                hasSpecial: /[^a-zA-Z0-9]/.test(pwd),
            });
        };
        validatePassword(password);
    }, [password]);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session?.user) {
                    // No session, redirect to login
                    toast.error('Sesión no válida. Por favor usa el enlace del correo nuevamente.');
                    navigate('/auth');
                    return;
                }

                const user = session.user;
                setEmail(user.email || null);
                setFullName(user.user_metadata?.full_name || null);
                setUserRole(user.user_metadata?.role || null);

                // Load existing profile data if any
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('phone, address')
                    .eq('user_id', user.id)
                    .single();

                if (profileData) {
                    const profile = profileData as any;
                    if (profile.phone) setPhone(profile.phone.replace(/^\+57/, ''));
                    if (profile.address) setAddress(profile.address || '');
                }
            } catch (error) {
                console.error('Error checking session:', error);
                toast.error('Error al verificar la sesión');
                navigate('/auth');
            } finally {
                setCheckingSession(false);
            }
        };

        checkSession();

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setEmail(session.user.email || null);
                setFullName(session.user.user_metadata?.full_name || null);
                setUserRole(session.user.user_metadata?.role || null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [navigate]);

    const isPasswordValid = () => {
        return Object.values(passwordValidation).every(v => v);
    };

    const handleSetupPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        if (!isPasswordValid()) {
            toast.error('La contraseña no cumple con los requisitos mínimos');
            return;
        }

        setLoading(true);

        try {
            // Update user password
            const { error: authError } = await supabase.auth.updateUser({
                password: password,
                data: {
                    setup_required: false // Mark setup as complete
                }
            });

            if (authError) throw authError;

            // Update profile with phone and address
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const updateData: any = {};
                if (phone) updateData.phone = `+57${phone}`;
                if (address) updateData.address = address;

                if (Object.keys(updateData).length > 0) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update(updateData)
                        .eq('user_id', user.id);

                    if (profileError) {
                        console.error('Error updating profile:', profileError);
                    }
                }
            }

            toast.success('¡Cuenta configurada exitosamente!', {
                description: 'Ahora puedes acceder al sistema.'
            });
            
            // Redirect to dashboard
            navigate('/dashboard');

        } catch (error: any) {
            console.error('Error setting up password:', error);
            toast.error('Error al configurar la cuenta', {
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadge = (role: string | null) => {
        const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
            admin: { label: 'Administrador', icon: <Shield className="h-3 w-3" />, className: 'bg-red-100 text-red-700 border-red-200' },
            receptionist: { label: 'Recepcionista', icon: <UserCheck className="h-3 w-3" />, className: 'bg-blue-100 text-blue-700 border-blue-200' },
            doctor: { label: 'Médico', icon: <UserCheck className="h-3 w-3" />, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        };
        const c = config[role || ''] || { label: 'Usuario', icon: <UserCheck className="h-3 w-3" />, className: 'bg-slate-100 text-slate-700 border-slate-200' };
        return (
            <Badge className={`${c.className} border flex items-center gap-1`}>
                {c.icon}
                {c.label}
            </Badge>
        );
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

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
                        <CardTitle className="text-xl font-bold relative z-10 uppercase tracking-tight">
                            ¡Bienvenido al Equipo!
                        </CardTitle>
                        <CardDescription className="text-teal-50/90 relative z-10">
                            Configura tu contraseña para comenzar
                        </CardDescription>
                    </div>

                    <CardContent className="p-8">
                        {/* User info card */}
                        {email && (
                            <div className="mb-6 bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl border border-teal-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-white p-2 rounded-lg shadow-sm border border-teal-100">
                                            <Mail className="h-4 w-4 text-teal-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Tu cuenta</p>
                                            <p className="text-sm font-bold text-teal-900">{email}</p>
                                        </div>
                                    </div>
                                    {getRoleBadge(userRole)}
                                </div>
                                {fullName && (
                                    <p className="text-sm text-teal-700 mt-2">
                                        Hola, <span className="font-semibold">{fullName}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleSetupPassword} className="space-y-5">
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
                                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                                    Nueva Contraseña
                                </Label>
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
                                
                                {/* Password requirements */}
                                <div className="grid grid-cols-2 gap-1 mt-2">
                                    <div className={`text-[10px] flex items-center gap-1 ${passwordValidation.minLength ? 'text-green-600' : 'text-slate-400'}`}>
                                        <CheckCircle className={`h-3 w-3 ${passwordValidation.minLength ? 'text-green-600' : 'text-slate-300'}`} />
                                        Mínimo 8 caracteres
                                    </div>
                                    <div className={`text-[10px] flex items-center gap-1 ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-slate-400'}`}>
                                        <CheckCircle className={`h-3 w-3 ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-slate-300'}`} />
                                        Una mayúscula
                                    </div>
                                    <div className={`text-[10px] flex items-center gap-1 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-slate-400'}`}>
                                        <CheckCircle className={`h-3 w-3 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-slate-300'}`} />
                                        Un número
                                    </div>
                                    <div className={`text-[10px] flex items-center gap-1 ${passwordValidation.hasSpecial ? 'text-green-600' : 'text-slate-400'}`}>
                                        <CheckCircle className={`h-3 w-3 ${passwordValidation.hasSpecial ? 'text-green-600' : 'text-slate-300'}`} />
                                        Un carácter especial
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                                    Confirmar Contraseña
                                </Label>
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
                                {password && confirmPassword && password !== confirmPassword && (
                                    <p className="text-[10px] text-red-500 font-semibold">Las contraseñas no coinciden</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-bold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-xl shadow-teal-700/20 text-white rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                disabled={loading || !isPasswordValid() || password !== confirmPassword}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Configurando...
                                    </>
                                ) : (
                                    <>
                                        Configurar Cuenta
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

export default SetupPassword;
