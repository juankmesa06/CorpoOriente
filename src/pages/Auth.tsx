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
import { Loader2, Stethoscope, UserCircle, UserPlus, Mail, CheckCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PublicNavbar } from '@/components/PublicNavbar';
import { Footer } from '@/components/Footer';

// Esquemas de validación
const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Mínimo 6 caracteres' }),
});
// ... (omitting unchanged parts for brevity if possible, but replace_file_content needs context)
// Actually I will just update the import line and the dialog content part.
// Splitting into two chunks is safer for replace_file_content if lines are far apart?
// Auth.tsx is small enough.
// Let's do imports first.


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

    // Validar
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

    // Validar
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNavbar />

      <main className="flex-grow flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 pt-24">
        <Card className="w-full max-w-md shadow-xl my-8">
          <CardHeader className="text-center space-y-2">
            <Link to="/" className="mx-auto block hover:opacity-80 transition-opacity cursor-pointer">
              <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto">
                <Stethoscope className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold italic text-primary mt-2">Centro PsicoTerapeutico de Oriente</CardTitle>
            </Link>
            <CardDescription>Sistema de gestión psicoterapéutica</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ingresando...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Dr. Juan Pérez"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar contraseña</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirm}
                      onChange={e => setSignupConfirm(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-medium">Registrarme como:</Label>
                    <RadioGroup
                      defaultValue="patient"
                      value={signupRole}
                      onValueChange={(val: 'doctor' | 'patient') => setSignupRole(val)}
                      className="flex flex-row gap-6 p-1"
                      disabled={isSubmitting}
                    >
                      <div className="flex items-center space-x-2 cursor-pointer">
                        <RadioGroupItem value="patient" id="patient" className="text-primary" />
                        <Label htmlFor="patient" className="font-normal cursor-pointer flex items-center gap-1.5">
                          <UserCircle className="h-4 w-4" /> Paciente
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 cursor-pointer">
                        <RadioGroupItem value="doctor" id="doctor" className="text-primary" />
                        <Label htmlFor="doctor" className="font-normal cursor-pointer flex items-center gap-1.5">
                          <Stethoscope className="h-4 w-4" /> Médico
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main >

      {/* Registration Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="items-center space-y-4 pt-4">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-green-700">¡Registro Exitoso!</DialogTitle>
            <DialogDescription className="text-lg text-slate-600">
              Gracias por unirte al <b>Centro PsicoTerapéutico de Oriente</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-slate-600">
            {/* Removed the paragraph that is now in description to avoid duplicity/nesting issues if any, or keep it. */
              /* The previous code had <p className="text-lg">... p>. I moved it to DialogDescription. */
            }
            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-left">
              <Mail className="h-5 w-5 text-blue-500 mt-1 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">Verifica tu correo electrónico</p>
                <p className="text-sm text-blue-700">
                  Hemos enviado un enlace de confirmación a <b>{signupEmail}</b> for security.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Por favor revisa tu bandeja de entrada (y la carpeta de Spam) para activar tu cuenta.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full bg-green-600 hover:bg-green-700">
              Entendido, ya reviso mi correo
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <Footer />
    </div >
  );
}
