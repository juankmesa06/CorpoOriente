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
  Video,
  Star,
  Quote,
  Shield,
  Clock,
  Award,
  CalendarCheck
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.hash && !location.hash.includes('access_token') && !location.hash.includes('type=')) {
      try {
        const element = document.querySelector(location.hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      } catch (error) {
        console.warn("Invalid hash selector:", location.hash);
      }
    }
  }, [location]);

  const services = [
    {
      title: "Psicoterapia Individual",
      desc: "Abordaje personalizado para ansiedad, depresión y autoconocimiento.",
      icon: Brain,
      color: "bg-teal-50 text-teal-600"
    },
    {
      title: "Terapia de Pareja",
      desc: "Espacio para fortalecer vínculos y resolver conflictos relacionales.",
      icon: Heart,
      color: "bg-rose-50 text-rose-600"
    },
    {
      title: "Terapia Familiar",
      desc: "Intervención sistémica para mejorar la dinámica del hogar.",
      icon: Users,
      color: "bg-indigo-50 text-indigo-600"
    },
    {
      title: "Psicología Infantil",
      desc: "Atención especializada para el desarrollo emocional de los niños.",
      icon: Star,
      color: "bg-amber-50 text-amber-600"
    },
    {
      title: "Gestión Emocional",
      desc: "Herramientas prácticas para el manejo del estrés y la ansiedad.",
      icon: Shield,
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      title: "Grupos de Apoyo",
      desc: "Espacios seguros para compartir experiencias guiados por expertos.",
      icon: MessageCircle,
      color: "bg-blue-50 text-blue-600"
    }
  ];

  const stats = [
    { number: "+10", label: "Años de Trayectoria", icon: Award },
    { number: "+500", label: "Pacientes Atendidos", icon: Users },
    { number: "15", label: "Especialistas", icon: Heart },
    { number: "98%", label: "Satisfacción", icon: Star }
  ];

  return (
    <div className="flex flex-col min-h-screen font-sans text-slate-900 bg-white selection:bg-teal-100 selection:text-teal-900">
      <PublicNavbar />

      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="relative px-4 py-20 lg:py-32 overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-50 via-white to-white opacity-70"></div>

          <div className="container relative z-10 mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-sm font-semibold tracking-wide uppercase">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </span>
                  Salud Mental Integral
                </div>

                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
                  Tu bienestar emocional es nuestra <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">prioridad</span>
                </h1>

                <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
                  En el Centro PsicoTerapéutico de Oriente combinamos experiencia clínica y calidez humana para acompañarte en tu proceso de transformación personal.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link to="/auth?mode=register">
                    <Button size="lg" className="w-full sm:w-auto rounded-full h-14 px-8 text-lg font-semibold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-200 transition-all hover:-translate-y-1">
                      Agendar Primera Cita
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <a href="#services">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full h-14 px-8 text-lg font-semibold border-2 border-slate-200 text-slate-700 hover:border-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-all">
                      Conocer Servicios
                    </Button>
                  </a>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-500 font-medium pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-teal-500" />
                    <span>Profesionales Certificados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-teal-500" />
                    <span>Confidencialidad Total</span>
                  </div>
                </div>
              </div>

              <div className="relative lg:h-[600px] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-teal-100/50 to-emerald-100/50 rounded-[3rem] transform rotate-3 scale-95 z-0"></div>
                <img
                  src="/hero-illustration.png"
                  alt="Bienestar Mental"
                  className="relative z-10 w-full max-w-lg h-auto object-cover rounded-[2.5rem] shadow-2xl shadow-teal-900/10 transform transition-transform duration-700 hover:scale-[1.02]"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=1000&auto=format&fit=crop";
                  }}
                />

                {/* Floating Badge */}
                <div className="absolute -bottom-6 -left-6 z-20 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-xs animate-bounce-slow hidden md:block">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-600">
                      <Star className="h-6 w-6 fill-current" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-lg">Excelencia</p>
                      <p className="text-sm text-slate-500">Valorados por nuestros pacientes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Strip */}
        <section className="py-12 bg-teal-900 text-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center group hover:scale-105 transition-transform duration-300">
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-teal-300 opacity-80 group-hover:opacity-100" />
                  <p className="text-4xl lg:text-5xl font-bold mb-1 tracking-tight">{stat.number}</p>
                  <p className="text-teal-200 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section id="services" className="py-24 bg-slate-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-teal-600 font-semibold tracking-wider uppercase text-sm">Nuestras Especialidades</span>
              <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-4 text-slate-900">Un enfoque integral para tu salud</h2>
              <p className="text-lg text-slate-600">
                Contamos con un equipo multidisciplinario preparado para atender diversas necesidades emocionales y psicológicas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, i) => (
                <div
                  key={i}
                  className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300 group"
                >
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center mb-6 ${service.color} transition-transform group-hover:scale-110`}>
                    <service.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-teal-600 transition-colors">{service.title}</h3>
                  <p className="text-slate-600 leading-relaxed">
                    {service.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <Link to="/auth?mode=register">
                <Button size="lg" variant="outline" className="rounded-full px-8 border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300">
                  Ver Todos los Servicios <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 bg-white overflow-hidden">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 relative">
                <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1000&auto=format&fit=crop"
                    alt="Sesión de terapia"
                    className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                  />
                </div>
                {/* Decorative pattern */}
                <div className="absolute top-10 -left-10 w-full h-full border-2 border-teal-100 rounded-[2.5rem] -z-10"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-50 rounded-full blur-3xl -z-10"></div>
              </div>

              <div className="lg:w-1/2 space-y-8">
                <div>
                  <span className="text-teal-600 font-semibold tracking-wider uppercase text-sm">Sobre Nosotros</span>
                  <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-6 text-slate-900 leading-tight">
                    Más que un centro médico, somos tu <span className="text-teal-600">refugio seguro</span>.
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    Fundado con la visión de humanizar la atención psicológica, el Centro PsicoTerapéutico de Oriente se ha convertido en un referente de excelencia y ética profesional en la región.
                  </p>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    Creemos firmemente que la salud mental es un derecho, no un privilegio. Por eso, trabajamos día a día para ofrecer servicios accesibles sin comprometer la calidad clínica.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    "Atención personalizada",
                    "Espacios modernos y confortables",
                    "Equipo en constante formación",
                    "Tecnología para citas online"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                      <span className="font-medium text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>

                <Link to="/auth?mode=register" className="inline-block">
                  <Button className="rounded-full h-12 px-8 bg-slate-900 text-white hover:bg-slate-800">
                    Conoce a Nuestro Equipo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Spaces Section (Rental) */}
        <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="lg:w-1/2 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-500/30">
                  <Building2 className="h-3 w-3" />
                  Para Profesionales
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold">Espacios diseñados para sanar</h2>
                <p className="text-slate-300 text-lg leading-relaxed max-w-lg">
                  Ofrecemos alquiler de consultorios totalmente equipados y espacios versátiles para talleres, eventos y conferencias. Un ambiente profesional para que tú te enfoques en tus pacientes.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Link to="/auth">
                    <Button className="rounded-full h-12 px-8 bg-teal-500 hover:bg-teal-600 text-white border-0 font-semibold shadow-lg shadow-teal-500/20">
                      Reservar Espacio
                    </Button>
                  </Link>
                  <Button variant="outline" className="rounded-full h-12 px-8 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-500">
                    Ver Galería
                  </Button>
                </div>
              </div>

              <div className="lg:w-1/2 grid grid-cols-2 gap-4">
                <div className="space-y-4 translate-y-8">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                    <Building2 className="h-8 w-8 text-teal-400 mb-4" />
                    <h3 className="font-bold text-lg mb-1">Consultorios</h3>
                    <p className="text-slate-400 text-sm">Privados y acústicos</p>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                    <Video className="h-8 w-8 text-purple-400 mb-4" />
                    <h3 className="font-bold text-lg mb-1">Virtuales</h3>
                    <p className="text-slate-400 text-sm">Salas de videollamada</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                    <Users className="h-8 w-8 text-amber-400 mb-4" />
                    <h3 className="font-bold text-lg mb-1">Salones</h3>
                    <p className="text-slate-400 text-sm">Para grupos y talleres</p>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                    <CalendarCheck className="h-8 w-8 text-emerald-400 mb-4" />
                    <h3 className="font-bold text-lg mb-1">Flexible</h3>
                    <p className="text-slate-400 text-sm">Por hora o día</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-teal-50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute top-40 -left-20 w-72 h-72 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Comienza hoy tu camino hacia el <span className="text-teal-600">bienestar</span>
            </h2>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              No estás solo. Nuestro equipo de profesionales está listo para escucharte y guiarte. Agenda tu cita de forma rápida y segura.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/auth?mode=register">
                <Button size="lg" className="w-full sm:w-auto rounded-full h-16 px-10 text-xl font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 hover:shadow-teal-600/30 transition-all transform hover:-translate-y-1">
                  Reservar Cita Ahora
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              * Registro gratuito y confidencial.
            </p>
          </div>
        </section>

        {/* Contact Strip */}
        <section id="contact" className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white shadow-sm text-teal-600">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Visítanos</p>
                  <p className="text-sm text-slate-600">Edif. Salud, Piso 3</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white shadow-sm text-teal-600">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Llámanos</p>
                  <p className="text-sm text-slate-600">+58 (281) 234-5678</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white shadow-sm text-teal-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Horario</p>
                  <p className="text-sm text-slate-600">Lun-Vie: 8am - 7pm</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/582812345678?text=Hola%2C%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 group"
      >
        <span className="relative flex h-14 w-14">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-14 w-14 bg-gradient-to-tr from-green-500 to-emerald-600 items-center justify-center shadow-lg shadow-green-600/40 transition-transform duration-300 transform group-hover:scale-110">
            <MessageCircle className="h-7 w-7 text-white" />
          </span>
        </span>
      </a>

      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out forwards;
        }
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
            animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div >
  );
};

export default Index;
