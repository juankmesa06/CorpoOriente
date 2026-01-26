import { Link } from "react-router-dom";
import { Stethoscope, MapPin, Phone, Mail, Facebook, Instagram, Twitter, Heart } from "lucide-react";

export const Footer = () => {
    return (
        <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <Link to="/" className="inline-flex items-center gap-3 group">
                            <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 rounded-xl shadow-lg group-hover:shadow-teal-500/50 transition-shadow">
                                <Stethoscope className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">
                                    <span className="text-teal-400">Centro</span>{" "}
                                    <span className="text-white">PsicoTerapéutico</span>
                                </h3>
                                <p className="text-xs text-slate-400">de Oriente</p>
                            </div>
                        </Link>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Tu bienestar mental es nuestra prioridad. Ofrecemos atención profesional y personalizada.
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="#"
                                className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-teal-600 flex items-center justify-center transition-colors"
                                aria-label="Facebook"
                            >
                                <Facebook className="h-4 w-4" />
                            </a>
                            <a
                                href="#"
                                className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-teal-600 flex items-center justify-center transition-colors"
                                aria-label="Instagram"
                            >
                                <Instagram className="h-4 w-4" />
                            </a>
                            <a
                                href="#"
                                className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-teal-600 flex items-center justify-center transition-colors"
                                aria-label="Twitter"
                            >
                                <Twitter className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Enlaces Rápidos</h4>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <a href="#services" className="text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                                    <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                                    Nuestros Servicios
                                </a>
                            </li>
                            <li>
                                <a href="#about" className="text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                                    <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                                    Sobre Nosotros
                                </a>
                            </li>
                            <li>
                                <a href="#contact" className="text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                                    <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                                    Contacto
                                </a>
                            </li>
                            <li>
                                <Link to="/auth" className="text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-2">
                                    <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                                    Agendar Cita
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Services */}
                    <div>
                        <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Especialidades</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="text-slate-400 flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                                Terapia Individual
                            </li>
                            <li className="text-slate-400 flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                                Terapia de Pareja
                            </li>
                            <li className="text-slate-400 flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                                Terapia Familiar
                            </li>
                            <li className="text-slate-400 flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                                Psicología Infantil
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Contacto</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-3 text-slate-400">
                                <MapPin className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                                <span>Av. Principal de Oriente, Edif. Salud, Piso 3</span>
                            </li>
                            <li className="flex items-center gap-3 text-slate-400">
                                <Phone className="h-5 w-5 text-teal-500 shrink-0" />
                                <a href="tel:+582812345678" className="hover:text-teal-400 transition-colors">
                                    +58 (281) 234-5678
                                </a>
                            </li>
                            <li className="flex items-center gap-3 text-slate-400">
                                <Mail className="h-5 w-5 text-teal-500 shrink-0" />
                                <a href="mailto:hola@centropsicooriente.com" className="hover:text-teal-400 transition-colors">
                                    hola@centropsicooriente.com
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-700 mt-12 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
                        <p className="flex items-center gap-2">
                            © 2026 Centro PsicoTerapéutico de Oriente. Todos los derechos reservados.
                        </p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-teal-400 transition-colors">Privacidad</a>
                            <a href="#" className="hover:text-teal-400 transition-colors">Términos</a>
                            <a href="#" className="hover:text-teal-400 transition-colors">Cookies</a>
                        </div>
                    </div>
                    <p className="text-center mt-4 text-xs text-slate-500 flex items-center justify-center gap-1">
                        Hecho con <Heart className="h-3 w-3 text-red-500 fill-red-500" /> para tu bienestar
                    </p>
                </div>
            </div>
        </footer>
    );
};
