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
  Sparkles,
  Shield,
  Clock,
  Award
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
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
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  const services = [
    {
      title: "Terapia Individual",
      desc: "Espacio personal para trabajar en ansiedad, depresión y autoconocimiento.",
      icon: Brain,
      color: "from-teal-500 to-cyan-500"
    },
    {
      title: "Terapia de Pareja",
      desc: "Fortalecemos la comunicación y resolvemos conflictos para una relación saludable.",
      icon: Heart,
      color: "from-pink-500 to-rose-500"
    },
    {
      title: "Terapia Familiar",
      desc: "Acompañamiento especializado para el desarrollo emocional de toda la familia.",
      icon: Users,
      color: "from-purple-500 to-indigo-500"
    },
    {
      title: "Psicología Infantil",
      desc: "Apoyo profesional para el desarrollo emocional y conductual de los niños.",
      icon: Sparkles,
      color: "from-amber-500 to-orange-500"
    },
    {
      title: "Manejo de Ansiedad",
      desc: "Técnicas efectivas para controlar y reducir los síntomas de ansiedad.",
      icon: Shield,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Grupos de Apoyo",
      desc: "Encuentros colectivos guiados por profesionales para compartir y sanar juntos.",
      icon: MessageCircle,
      color: "from-green-500 to-emerald-500"
    }
  ];

  const stats = [
    { number: "500+", label: "Pacientes Atendidos", icon: Users },
    { number: "95%", label: "Satisfacción", icon: Star },
    { number: "10+", label: "Años de Experiencia", icon: Award },
    { number: "15", label: "Especialistas", icon: Heart }
  ];

  const testimonials = [
    {
      text: "El proceso terapéutico aquí cambió mi vida. Encontré las herramientas para manejar mi ansiedad y recuperar mi paz interior.",
      name: "María G.",
      rating: 5
    },
    {
      text: "Profesionales excepcionales. La terapia de pareja salvó nuestra relación. Eternamente agradecidos.",
      name: "Carlos y Ana",
      rating: 5
    },
    {
      text: "Mi hijo ha mejorado increíblemente. La psicóloga infantil es maravillosa y muy profesional.",
      name: "Patricia M.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "¿Cómo puedo agendar una cita?",
      answer: "Puedes agendar tu cita fácilmente a través de nuestro sistema en línea. Solo necesitas registrarte, seleccionar el especialista y el horario que mejor te convenga."
    },
    {
      question: "¿Aceptan seguros médicos?",
      answer: "Sí, trabajamos con las principales aseguradoras. Contáctanos para verificar si tu seguro está incluido en nuestra red de proveedores."
    },
    {
      question: "¿Ofrecen terapia virtual?",
      answer: "Sí, ofrecemos sesiones virtuales a través de nuestra plataforma segura de videollamadas. Puedes recibir atención desde la comodidad de tu hogar."
    },
    {
      question: "¿Cuánto dura una sesión?",
      answer: "Las sesiones individuales tienen una duración de 50 minutos. Las sesiones de pareja o familia pueden extenderse a 60-90 minutos según las necesidades."
    },
    {
      question: "¿Es confidencial la información?",
      answer: "Absolutamente. Toda la información compartida en terapia está protegida por el secreto profesional y cumplimos con todas las normativas de privacidad."
    },
    {
      question: "¿Cuántas sesiones necesitaré?",
      answer: "Cada proceso es único. Algunos pacientes ven mejoras en 8-12 sesiones, mientras que otros requieren acompañamiento a más largo plazo. Lo evaluamos juntos."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen font-sans text-slate-900 bg-white">
      <PublicNavbar />

      <main className="flex-grow pt-16">
        {/* Hero Section - Modern Gradient */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-slate-900">
          {/* Animated Background Shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="container relative z-10 mx-auto px-4 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-white">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold mb-6">
                  <Heart className="h-4 w-4" />
                  Tu bienestar mental es nuestra prioridad
                </div>

                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                  Encuentra la paz y el equilibrio que <span className="text-teal-200 italic">mereces</span>
                </h1>

                <p className="text-xl text-teal-50 mb-10 leading-relaxed max-w-xl">
                  En el Centro PsicoTerapéutico de Oriente, ofrecemos un espacio seguro y profesional para acompañarte en tu proceso de sanación y crecimiento personal.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth?mode=register">
                    <Button size="lg" className="rounded-full px-8 h-14 text-lg bg-white text-teal-600 hover:bg-teal-50 shadow-2xl shadow-black/20 transition-all hover:scale-105">
                      Comienza Tu Proceso Ahora
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <a href="#services">
                    <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm">
                      Ver Especialidades
                    </Button>
                  </a>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-6 mt-12 text-white/90">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-teal-200" />
                    <span className="text-sm font-medium">10+ Años</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-teal-200" />
                    <span className="text-sm font-medium">500+ Pacientes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-teal-200" />
                    <span className="text-sm font-medium">Certificados</span>
                  </div>
                </div>
              </div>

              {/* Right Illustration */}
              <div className="hidden lg:block">
                <div className="relative">
                  <img
                    src="/hero-illustration.png"
                    alt="Mental Health Illustration"
                    className="w-full h-auto drop-shadow-2xl animate-float"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Wave Divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
              <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
            </svg>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-teal-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-700"></div>
          <div className="container relative z-10 mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <stat.icon className="h-12 w-12 mx-auto mb-4 text-teal-200" />
                  <p className="text-5xl font-bold mb-2">{stat.number}</p>
                  <p className="text-teal-100 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-24 relative">
          <div className="absolute inset-0 opacity-30">
            <img src="/services-pattern.png" alt="" className="w-full h-full object-cover" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">Nuestros Servicios</h2>
              <p className="text-xl text-slate-600">Especialidades diseñadas para cada etapa de la vida</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, i) => (
                <div
                  key={i}
                  className="group p-8 rounded-3xl bg-white border-2 border-slate-100 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-100/50 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <service.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-teal-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">Lo Que Dicen Nuestros Pacientes</h2>
              <p className="text-xl text-slate-600">Historias reales de transformación y crecimiento</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all">
                  <Quote className="h-10 w-10 text-teal-500 mb-4" />
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-6 italic leading-relaxed">"{testimonial.text}"</p>
                  <p className="font-semibold text-slate-900">— {testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About/Team Section */}
        <section id="about" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
                  <img src="/team-bg.png" alt="Centro" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-8 -right-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 text-white shadow-2xl max-w-[280px]">
                  <p className="text-4xl font-bold mb-2">10+</p>
                  <p className="text-sm opacity-90">Años transformando vidas en el oriente</p>
                </div>
              </div>

              <div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-8 leading-tight">
                  Comprometidos con tu <span className="text-teal-600 italic">evolución</span> emocional
                </h2>
                <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                  El Centro PsicoTerapéutico de Oriente nació con la misión de democratizar el acceso a la salud mental de alta calidad. Nuestro equipo está conformado por especialistas certificados en diversas ramas de la psicología clínica.
                </p>
                <ul className="space-y-4 mb-10">
                  {[
                    "Atención personalizada y ética",
                    "Ambiente seguro y confidencial",
                    "Enfoques terapéuticos modernos",
                    "Facilidad de agendamiento online"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-teal-600" />
                      </div>
                      <span className="font-medium text-slate-700 text-lg">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl lg:text-5xl font-bold mb-4">Preguntas Frecuentes</h2>
                <p className="text-xl text-slate-600">Todo lo que necesitas saber</p>
              </div>

              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="bg-white rounded-2xl border-2 border-slate-100 px-6 shadow-sm hover:shadow-md transition-all"
                  >
                    <AccordionTrigger className="text-left font-semibold text-lg hover:text-teal-600 py-6">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 leading-relaxed pb-6">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Room Rental Section */}
        <section className="py-24 bg-gradient-to-br from-teal-50 to-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-bold mb-6">
                  <Building2 className="h-4 w-4" />
                  Espacios Profesionales
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">Alquila Nuestros Espacios</h2>
                <p className="text-xl text-slate-600">
                  Consultorios equipados, salones para eventos y espacios virtuales disponibles
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                  { icon: Building2, title: "5 Consultorios", desc: "Espacios físicos equipados" },
                  { icon: Users, title: "2 Salones", desc: "Para talleres y eventos" },
                  { icon: Video, title: "Espacios Virtuales", desc: "Salas de videollamada" }
                ].map((space, i) => (
                  <div key={i} className="p-8 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1">
                    <space.icon className="h-12 w-12 text-teal-600 mx-auto mb-4" />
                    <h3 className="font-bold text-xl mb-2 text-center">{space.title}</h3>
                    <p className="text-sm text-slate-600 text-center">{space.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-teal-100 text-center">
                <p className="text-lg font-semibold mb-2">¿Necesitas alquilar un espacio?</p>
                <p className="text-slate-600 mb-6">Inicia sesión para acceder al sistema de reservas</p>
                <Link to="/auth">
                  <Button size="lg" className="rounded-full px-8 h-14 text-lg shadow-lg shadow-teal-600/20">
                    Iniciar Sesión para Reservar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-gradient-to-br from-teal-600 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-10 right-10 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              ¿Listo para comenzar tu proceso?
            </h2>
            <p className="text-xl text-teal-100 mb-10 max-w-2xl mx-auto">
              Da el primer paso hacia una vida más plena y equilibrada. Agenda tu primera consulta hoy.
            </p>
            <Link to="/auth?mode=register">
              <Button size="lg" className="rounded-full px-12 h-16 text-xl bg-white text-teal-600 hover:bg-teal-50 shadow-2xl shadow-black/30 transition-all hover:scale-105">
                Agenda tu Primera Consulta
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>
            <p className="text-teal-200 mt-6 text-sm">✨ Primera sesión con 20% de descuento</p>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div>
                <h2 className="text-4xl font-bold mb-6">Contáctanos</h2>
                <p className="text-slate-600 mb-12 text-lg">
                  Estamos aquí para ayudarte. Contáctanos y recibe orientación inicial sin costo.
                </p>

                <div className="space-y-6">
                  {[
                    { icon: MapPin, label: "Ubicación", value: "Av. Principal de Oriente, Edif. Salud, Piso 3" },
                    { icon: Phone, label: "Teléfono / WhatsApp", value: "+58 (281) 234-5678" },
                    { icon: Mail, label: "Correo Electrónico", value: "hola@centropsicooriente.com" },
                    { icon: Clock, label: "Horario", value: "Lun - Vie: 8:00 AM - 7:00 PM" }
                  ].map((contact, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <contact.icon className="h-6 w-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">{contact.label}</p>
                        <p className="text-lg font-semibold text-slate-900">{contact.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-3xl p-10 shadow-xl">
                <h3 className="text-2xl font-bold mb-8">Envíanos un mensaje</h3>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Asunto</label>
                    <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all">
                      <option>Terapia Individual</option>
                      <option>Terapia de Pareja</option>
                      <option>Terapia Infantil</option>
                      <option>Consulta General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mensaje</label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all resize-none"
                      placeholder="¿Cómo podemos ayudarte?"
                    ></textarea>
                  </div>
                  <Button className="w-full h-14 rounded-xl text-lg font-semibold shadow-lg shadow-teal-600/20">
                    Enviar Solicitud
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Index;
