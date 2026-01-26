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
import { Loader2, Stethoscope, UserCircle, Mail, CheckCircle, Lock, User, ArrowRight } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PublicNavbar } from '@/components/PublicNavbar';
import { Footer } from '@/components/Footer';

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
  const { user, loading, signIn, signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupRole, setSignupRole] = useState<'doctor' | 'patient'>('patient');

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-50">
      <PublicNavbar />

      <main className="flex-grow flex items-center justify-center p-4 pt-28 pb-12">
        <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-8 text-center text-white">
            <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl w-fit mx-auto mb-4">
                <Stethoscope className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Centro PsicoTerapéutico</h1>
              <p className="text-teal-100 text-sm font-medium">de Oriente</p>
            </Link>
          </div>

          <CardContent className="p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 h-12">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">
                  Registrarse
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-5">
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
                        className="pl-11 h-12 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
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
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="pl-11 h-12 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <span className="text-xs">⚠</span> {errors.password}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-lg shadow-teal-600/30 text-white"
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
              <TabsContent value="signup" className="space-y-5">
                <form onSubmit={handleSignup} className="space-y-5">
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
                        className="pl-11 h-12 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <span className="text-xs">⚠</span> {errors.fullName}
                      </p>
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
                        className="pl-11 h-12 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <span className="text-xs">⚠</span> {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-semibold text-slate-700">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="pl-11 h-12 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <span className="text-xs">⚠</span> {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-sm font-semibold text-slate-700">
                      Confirmar Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupConfirm}
                        onChange={e => setSignupConfirm(e.target.value)}
                        disabled={isSubmitting}
                        className="pl-11 h-12 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <span className="text-xs">⚠</span> {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-semibold text-slate-700">Registrarme como:</Label>
                    <RadioGroup
                      defaultValue="patient"
                      value={signupRole}
                      onValueChange={(val: 'doctor' | 'patient') => setSignupRole(val)}
                      className="grid grid-cols-2 gap-3"
                      disabled={isSubmitting}
                    >
                      <div className={`flex items-center space-x-3 border-2 rounded-xl p-4 cursor-pointer transition-all ${signupRole === 'patient' ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <RadioGroupItem value="patient" id="patient" className="text-teal-600" />
                        <Label htmlFor="patient" className="font-medium cursor-pointer flex items-center gap-2 flex-1">
                          <UserCircle className="h-5 w-5 text-teal-600" />
                          <span>Paciente</span>
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-3 border-2 rounded-xl p-4 cursor-pointer transition-all ${signupRole === 'doctor' ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <RadioGroupItem value="doctor" id="doctor" className="text-teal-600" />
                        <Label htmlFor="doctor" className="font-medium cursor-pointer flex items-center gap-2 flex-1">
                          <Stethoscope className="h-5 w-5 text-teal-600" />
                          <span>Médico</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-lg shadow-teal-600/30 text-white"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center space-y-4 pt-4">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-green-700 text-center">
              ¡Registro Exitoso!
            </DialogTitle>
            <DialogDescription className="text-center text-base text-slate-600">
              Gracias por unirte al <span className="font-semibold text-teal-700">Centro PsicoTerapéutico de Oriente</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-900">Verifica tu correo electrónico</p>
                <p className="text-sm text-blue-700">
                  Hemos enviado un enlace de confirmación a <span className="font-semibold">{signupEmail}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 text-center">
              Por favor revisa tu bandeja de entrada (y la carpeta de Spam) para activar tu cuenta.
            </p>
          </div>

          <Button
            onClick={() => setShowSuccessDialog(false)}
            className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
          >
            Entendido, ya reviso mi correo
          </Button>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
