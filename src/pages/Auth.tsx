import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Stethoscope, UserCircle, Mail, CheckCircle, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { es } from 'date-fns/locale';

// Esquemas de validación
const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Mínimo 6 caracteres' }),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, { message: 'Nombre requerido' }).max(100),
  email: z.string().trim().email({ message: 'Email inválido' }),
  password: z.string()
    .min(8, { message: 'Mínimo 8 caracteres' })
    .regex(/[A-Z]/, { message: 'Al menos una mayúscula' })
    .regex(/[0-9]/, { message: 'Al menos un número' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Al menos un carácter especial (@, #, etc)' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetPending, setIsResetPending] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupRole, setSignupRole] = useState<'doctor' | 'patient'>('patient');

  // Visibility States
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  // Check for errors in URL (e.g. from email confirmation)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1)); // Remove the #
      const errorDescription = params.get('error_description');
      const error = params.get('error');

      if (errorDescription) {
        toast.error(errorDescription.replace(/\+/g, ' '));
      } else if (error) {
        toast.error(`Error: ${error}`);
      }
    }
  }, []);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (user && !loading && !showSuccessDialog) {
      navigate('/');
    }
  }, [user, loading, navigate, showSuccessDialog]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Credenciales inválidas');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success('¡Bienvenido!');
    navigate('/');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({
      fullName: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirm,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email ya está registrado');
      } else {
        toast.error(error.message);
      }
      return;
    }

    setShowSuccessDialog(true);
  };


  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }

    setIsResetPending(true);
    const { error } = await resetPassword(resetEmail);
    setIsResetPending(false);

    if (error) {
      toast.error('Error al enviar el correo: ' + error.message);
      return;
    }

    toast.success('Correo de recuperación enviado');
    setShowResetDialog(false);
    setResetEmail('');
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
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
            <Link to="/" className="inline-block hover:opacity-90 transition-opacity relative z-10">
              <div className="bg-white p-2 rounded-2xl w-fit mx-auto mb-3 shadow-lg border border-teal-100">
                <img
                  src="/logo.png"
                  alt="Centro Psicoterapéutico de Oriente"
                  className="h-14 w-auto object-contain"
                />
              </div>
            </Link>
          </div>

          <CardContent className="p-6 sm:p-8 pb-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100/80 p-1.5 h-14 rounded-xl border border-slate-200/50">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-teal-700 font-bold transition-all text-slate-500">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-teal-700 font-bold transition-all text-slate-500">
                  Registrarse
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold text-slate-700">
                      Correo Electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="pl-11 h-12 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-teal-500 transition-all bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 uppercase tracking-wider">
                        <span className="text-xs">⚠</span> {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="pl-11 pr-10 h-12 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-teal-500 transition-all bg-slate-50/50 focus:bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-5 w-5 text-slate-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-slate-400" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 uppercase tracking-wider">
                        <span className="text-xs">⚠</span> {errors.password}
                      </p>
                    )}
                    <div className="flex justify-end mt-1">
                      <Button
                        type="button"
                        variant="link"
                        className="text-teal-600 font-semibold p-0 h-auto hover:text-teal-700 text-xs"
                        onClick={() => setShowResetDialog(true)}
                      >
                        ¿Olvidaste tu contraseña?
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-xl shadow-teal-700/20 text-white rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Ingresando...
                      </>
                    ) : (
                      <>
                        Iniciar Sesión
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="space-y-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-semibold text-slate-700">
                      Nombre Completo
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={signupName}
                        onChange={e => setSignupName(e.target.value)}
                        disabled={isSubmitting}
                        className="pl-11 h-12 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-teal-500 bg-slate-50/50"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-[11px] text-red-500 font-bold uppercase mt-1">⚠ {errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-semibold text-slate-700">
                      Correo Electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="pl-11 h-12 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-teal-500 bg-slate-50/50"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-[11px] text-red-500 font-bold uppercase mt-1">⚠ {errors.email}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-semibold text-slate-700">
                        Contraseña
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={e => setSignupPassword(e.target.value)}
                          disabled={isSubmitting}
                          className="pl-10 pr-10 h-11 border-slate-200 rounded-xl text-sm focus:border-teal-500 bg-slate-50/50"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-sm font-semibold text-slate-700">
                        Confirmar
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signup-confirm"
                          type={showSignupConfirm ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupConfirm}
                          onChange={e => setSignupConfirm(e.target.value)}
                          disabled={isSubmitting}
                          className="pl-10 pr-10 h-11 border-slate-200 rounded-xl text-sm focus:border-teal-500 bg-slate-50/50"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                        >
                          {showSignupConfirm ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-500 font-bold uppercase mt-1">⚠ {errors.password}</p>
                  )}
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-red-500 font-bold uppercase mt-1">⚠ {errors.confirmPassword}</p>
                  )}

                  <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100/50 flex items-center gap-3">
                    <UserCircle className="h-6 w-6 text-teal-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-teal-900 leading-none">Paciente</p>
                      <p className="text-[11px] text-teal-600 mt-1">Acceso inmediato a especialistas y agenda</p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-xl shadow-teal-700/20 text-white rounded-xl transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      <>
                        Crear Cuenta
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Registration Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="items-center space-y-4 pt-4">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-800 text-center uppercase tracking-tight">
              ¡Registro Exitoso!
            </DialogTitle>
            <DialogDescription className="text-center text-base text-slate-500">
              Gracias por unirte al <span className="font-bold text-teal-600">Centro PsicoTerapéutico de Oriente</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-900">Verifica tu correo electrónico</p>
                <p className="text-sm text-blue-700/80">
                  Hemos enviado un enlace de confirmación a <span className="font-bold">{signupEmail}</span>
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowSuccessDialog(false)}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20"
          >
            Entendido, ya reviso mi correo
          </Button>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="items-center space-y-4 pt-4">
            <div className="bg-slate-100 p-4 rounded-full text-teal-600">
              <Lock className="h-12 w-12" />
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-800 text-center uppercase tracking-tight">
              Recuperar Acceso
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500">
              Ingresa tu correo y te enviaremos las instrucciones de restablecimiento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-5 py-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  disabled={isResetPending}
                  className="pl-11 h-12 border-slate-200 rounded-xl focus:border-teal-500 bg-slate-50/50"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg"
              disabled={isResetPending}
            >
              {isResetPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar Instrucciones"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
}
