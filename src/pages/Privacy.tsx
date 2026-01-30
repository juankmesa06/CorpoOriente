import { PublicNavbar } from "@/components/PublicNavbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            <main className="flex-grow pt-28 pb-16 px-4">
                <div className="container mx-auto max-w-4xl bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-0 print:p-0">
                    <div className="flex items-center justify-between mb-8 print:hidden">
                        <Link to="/">
                            <Button variant="ghost" className="gap-2 text-slate-600 hover:text-teal-700">
                                <ArrowLeft className="h-4 w-4" />
                                Volver al Inicio
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => window.print()}
                        >
                            <Printer className="h-4 w-4" />
                            Imprimir / Guardar como PDF
                        </Button>
                    </div>

                    <div className="prose prose-slate prose-teal max-w-none text-justify">
                        <header className="text-center mb-12 border-b border-slate-100 pb-8">
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">Política de Privacidad</h1>
                            <p className="text-slate-500">Última actualización: Enero 2026</p>
                        </header>

                        <section className="space-y-6">
                            <h3>1. Identidad del Responsable</h3>
                            <p>
                                <strong>Centro PsicoTerapéutico de Oriente</strong> (en adelante, "la Organización"), con domicilio en Calle 48 #62b 106, Rionegro, Antioquia, es responsable del tratamiento de los datos personales de sus usuarios y pacientes.
                            </p>

                            <h3>2. Información que Recopilamos</h3>
                            <p>
                                Recopilamos información necesaria para la prestación de servicios de salud mental y el agendamiento de citas, incluyendo:
                            </p>
                            <ul>
                                <li><strong>Datos de Identificación:</strong> Nombre, apellidos, documento de identidad.</li>
                                <li><strong>Datos de Contacto:</strong> Correo electrónico, número telefónico, dirección.</li>
                                <li><strong>Datos de Salud:</strong> Información clínica necesaria para la atención psicoterapéutica (sujeta a reserva legal).</li>
                            </ul>

                            <h3>3. Finalidad del Tratamiento</h3>
                            <p>
                                Sus datos serán utilizados exclusivamente para:
                            </p>
                            <ul>
                                <li>Gestionar el agendamiento y recordatorio de citas.</li>
                                <li>Prestar servicios de atención psicológica y terapéutica.</li>
                                <li>Facturación y trámites administrativos.</li>
                                <li>Comunicación sobre cambios en el servicio o nuevas funcionalidades.</li>
                            </ul>

                            <h3>4. Protección de Datos</h3>
                            <p>
                                Implementamos medidas de seguridad técnicas, físicas y administrativas para proteger sus datos personales contra acceso no autorizado, pérdida o alteración. La información clínica es tratada con estricta confidencialidad conforme a la ética profesional y la legislación vigente.
                            </p>

                            <h3>5. Derechos del Usuario (Habeas Data)</h3>
                            <p>
                                Usted tiene derecho a conocer, actualizar y rectificar sus datos personales. Para ejercer estos derechos, puede contactarnos a través del correo electrónico: <strong>Hola@cpo.co</strong>.
                            </p>

                            <h3>6. Cambios en la Política</h3>
                            <p>
                                Nos reservamos el derecho de modificar esta política en cualquier momento. Cualquier cambio será publicado en esta plataforma.
                            </p>
                        </section>

                        <footer className="mt-12 pt-8 border-t border-slate-100 text-center text-sm text-slate-500 print:mt-4">
                            <p>© 2026 Centro PsicoTerapéutico de Oriente. Todos los derechos reservados.</p>
                        </footer>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Privacy;
