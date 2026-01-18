import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Heart,
  Brain,
  Users,
  MessageCircle,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Building2,
  Video
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";

const Index = () => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-slate-900 bg-slate-50">
      <PublicNavbar />

      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="relative py-24 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/hero-bg.png"
              alt="Background"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
                <Heart className="h-3 w-3" />
                Tu bienestar mental es nuestra prioridad
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                Encuentra la paz y el equilibrio que <span className="text-primary italic">mereces</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl">
                En el Centro PsicoTerapeutico de Oriente, ofrecemos un espacio seguro y profesional para acompañarte en tu proceso de sanación y crecimiento personal.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth?mode=register">
                  <Button size="lg" className="rounded-full px-8 h-14 text-lg shadow-xl shadow-primary/30">
                    Comienza Tu Proceso Ahora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg bg-white">
                    Ver Especialidades
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Support CTA Section */}
        <section className="py-12 -mt-12 relative z-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto bg-white p-10 lg:p-12 rounded-[3.5rem] shadow-2xl shadow-primary/10 border border-primary/5 relative overflow-hidden text-center">
              <div className="absolute top-0 left-0 p-10 opacity-[0.03] pointer-events-none">
                <Heart className="h-64 w-64 text-primary" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-bold mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Atención Inmediata
                </div>
                <h2 className="text-3xl lg:text-5xl font-bold mb-6 tracking-tight">
                  No te sientas solo, <span className="text-primary italic">estamos contigo</span>
                </h2>
                <p className="text-lg lg:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                  En momentos difíciles, contar con el apoyo profesional adecuado marca la diferencia. Agenda tu cita hoy mismo y empieza a transformar tu realidad.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/auth?mode=register">
                    <Button size="lg" className="rounded-full px-12 h-16 text-xl shadow-xl shadow-primary/30 w-full sm:w-auto transition-transform hover:scale-105 active:scale-95">
                      Reserva Una Cita
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>
                  <a href="#contact" className="text-slate-500 font-medium hover:text-primary transition-colors py-2 px-4">
                    Hablar con alguien primero
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Nuestros Servicios</h2>
              <p className="text-slate-600 italic">Especialidades diseñadas para cada etapa de la vida</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  title: "Terapia Individual",
                  desc: "Espacio personal para trabajar en ansiedad, depresión y autoconocimiento.",
                  icon: Brain
                },
                {
                  title: "Terapia de Pareja",
                  desc: "Fortalecemos la comunicación y resolvemos conflictos para una relación saludable.",
                  icon: Heart
                },
                {
                  title: "Terapia Infantil",
                  desc: "Acompañamiento especializado para el desarrollo emocional de los más pequeños.",
                  icon: Users
                },
                {
                  title: "Grupos de Apoyo",
                  desc: "Encuentros colectivos guiados por profesionales para compartir y sanar juntos.",
                  icon: MessageCircle
                }
              ].map((service, i) => (
                <div key={i} className="p-8 rounded-3xl border border-slate-100 bg-slate-50 hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 relative">
                <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
                  <img src="/hero-bg.png" alt="Centro" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-8 -right-8 bg-primary rounded-3xl p-8 text-white shadow-xl max-w-[240px]">
                  <p className="text-3xl font-bold mb-1">15+</p>
                  <p className="text-sm opacity-80 decoration-slate-200">Años de experiencia transformando vidas en el oriente.</p>
                </div>
              </div>
              <div className="lg:w-1/2">
                <h2 className="text-4xl lg:text-5xl font-bold mb-8 leading-tight">Comprometidos con tu <span className="text-primary italic">evolución</span> emocional</h2>
                <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                  El Centro PsicoTerapeutico de Oriente nació con la misión de democratizar el acceso a la salud mental de alta calidad. Nuestro equipo está conformado por especialistas certificados en diversas ramas de la psicología clínica.
                </p>
                <ul className="space-y-4 mb-10">
                  {["Atención personalizada y ética", "Ambiente seguro y confidencial", "Enfoques terapéuticos modernos", "Facilidad de agendamiento online"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                      <span className="font-medium text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth?mode=register">
                  <Button variant="outline" className="rounded-full px-8 h-12">Conocer al Equipo</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Room Rental Section */}
        <section className="py-24 bg-gradient-to-br from-primary/5 to-slate-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
                <Building2 className="h-3 w-3" />
                Espacios Profesionales
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">Alquila Nuestros Espacios</h2>
              <p className="text-xl text-slate-600 mb-8">
                Consultorios equipados, salones para eventos y espacios virtuales disponibles para profesionales de la salud mental
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="p-6 bg-white rounded-2xl shadow-lg">
                  <Building2 className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">5 Consultorios</h3>
                  <p className="text-sm text-slate-600">Espacios físicos completamente equipados</p>
                </div>
                <div className="p-6 bg-white rounded-2xl shadow-lg">
                  <Users className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">2 Salones</h3>
                  <p className="text-sm text-slate-600">Para talleres y eventos grupales</p>
                </div>
                <div className="p-6 bg-white rounded-2xl shadow-lg">
                  <Video className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Espacios Virtuales</h3>
                  <p className="text-sm text-slate-600">Salas de videollamada seguras</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-primary/20">
                <p className="text-center text-slate-600 mb-4">
                  <strong>¿Necesitas alquilar un espacio?</strong>
                </p>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Inicia sesión como paciente o médico para acceder al sistema de reservas
                </p>
                <Link to="/auth" className="block">
                  <Button size="lg" className="w-full rounded-full shadow-lg shadow-primary/20">
                    Iniciar Sesión para Reservar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 bg-slate-900 text-white rounded-[4rem] mx-4 mb-4 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 blur-[100px] pointer-events-none" />
          <div className="container mx-auto px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
              <div>
                <h2 className="text-4xl font-bold mb-6">¿Estás listo para dar el primer paso?</h2>
                <p className="text-slate-400 mb-12 text-lg">
                  Contáctanos hoy mismo y recibe una orientación inicial sin costo para encontrar el terapeuta ideal para ti.
                </p>
                <div className="space-y-8">
                  <div className="flex items-center gap-6 group">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1 font-medium">Ubicación</p>
                      <p className="text-lg font-bold">Av. Principal de Oriente, Edif. Salud, Piso 3</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 group">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1 font-medium">Teléfono / WhatsApp</p>
                      <p className="text-lg font-bold">+58 (281) 234-5678</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 group">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1 font-medium">Correo Electrónico</p>
                      <p className="text-lg font-bold">hola@centropsicooriente.com</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-10 text-slate-900 shadow-2xl">
                <h3 className="text-2xl font-bold mb-8">Envíanos un mensaje</h3>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                      <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Tu nombre" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Email</label>
                      <input type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="tu@email.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Asunto</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary transition-all">
                      <option>Terapia Individual</option>
                      <option>Terapia de Pareja</option>
                      <option>Terapia Infantil</option>
                      <option>Consulta General</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Mensaje</label>
                    <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary transition-all resize-none" placeholder="¿Cómo podemos ayudarte?"></textarea>
                  </div>
                  <Button className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">Enviar Solicitud</Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div >
  );
};

export default Index;
