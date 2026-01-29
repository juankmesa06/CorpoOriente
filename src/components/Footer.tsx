import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter } from "lucide-react";

export const Footer = () => {
    return (
        <footer className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-slate-300 py-12 border-t border-teal-900/50 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 opacity-50"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                    {/* Brand Column */}
                    <div className="space-y-6">
                        <Link to="/" className="inline-block">
                            <div className="bg-white/95 p-3 rounded-xl shadow-lg shadow-teal-900/20 backdrop-blur-sm inline-block">
                                <img
                                    src="/logo.png"
                                    alt="Centro Psicoterapéutico de Oriente"
                                    className="h-10 w-auto"
                                />
                            </div>
                        </Link>
                        <p className="text-sm leading-relaxed text-slate-400 max-w-xs font-light">
                            Comprometidos con tu bienestar mental y emocional. Creando espacios seguros para sanar, crecer y transformar vidas.
                        </p>
                        <div className="flex gap-4">
                            {[Facebook, Instagram, Twitter].map((Icon, i) => (
                                <a
                                    key={i}
                                    href="#"
                                    className="h-9 w-9 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-teal-600 hover:border-teal-500 hover:text-white flex items-center justify-center transition-all duration-300 text-slate-400 group"
                                >
                                    <Icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-semibold text-lg mb-6 tracking-tight">Menú Principal</h4>
                        <ul className="space-y-3 text-sm">
                            {[
                                { label: 'Nuestros Servicios', href: '#services' },
                                { label: 'Sobre Nosotros', href: '#about' },
                                { label: 'Contacto', href: '#contact' },
                                { label: 'Portal de Pacientes', href: '/auth' }
                            ].map((link, i) => (
                                <li key={i}>
                                    <a
                                        href={link.href}
                                        className="text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-3 group"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-700 group-hover:bg-teal-400 transition-colors"></div>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white font-semibold text-lg mb-6 tracking-tight">Contacto</h4>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start gap-4 text-slate-400 group">
                                <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/20 transition-colors mt-0.5">
                                    <MapPin className="h-4 w-4 text-teal-400" />
                                </div>
                                <span className="group-hover:text-slate-300 transition-colors">Calle 48 #62b 106, Rionegro, Antioquia</span>
                            </li>
                            <li className="flex items-center gap-4 text-slate-400 group">
                                <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/20 transition-colors">
                                    <Phone className="h-4 w-4 text-teal-400" />
                                </div>
                                <a href="tel:+573217861080" className="group-hover:text-teal-400 transition-colors">
                                    +57 321 786 10 80
                                </a>
                            </li>
                            <li className="flex items-center gap-4 text-slate-400 group">
                                <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/20 transition-colors">
                                    <Mail className="h-4 w-4 text-teal-400" />
                                </div>
                                <a href="mailto:Hola@cpo.co" className="group-hover:text-teal-400 transition-colors">
                                    Hola@cpo.co
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-800/50 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                    <p className="hover:text-slate-400 transition-colors cursor-default">
                        © 2026 Centro Psicoterapéutico de Oriente.
                    </p>
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-slate-800/30 px-6 py-2 rounded-full backdrop-blur-sm border border-slate-700/30">
                        <p className="flex items-center gap-2">
                            <span className="opacity-70">Desarrollado por</span>
                            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Aríme Software</span>
                        </p>
                        <div className="w-px h-3 bg-slate-700 hidden md:block"></div>
                        <div className="flex gap-4 opacity-70">
                            <a href="#" className="hover:text-teal-400 transition-colors">Privacidad</a>
                            <a href="#" className="hover:text-teal-400 transition-colors">Términos</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};
