import { PublicNavbar } from "@/components/PublicNavbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { Link } from "react-router-dom";

const Terms = () => {
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
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">Términos y Condiciones</h1>
                            <p className="text-slate-500">Última actualización: Enero 2026</p>
                        </header>

                        <section className="space-y-6">
                            <h3>1. Aceptación de los Términos</h3>
                            <p>
                                Al acceder y utilizar los servicios digitales del <strong>Centro PsicoTerapéutico de Oriente</strong>, usted acepta cumplir con los presentes términos y condiciones. Si no está de acuerdo con alguna parte, le rogamos no utilizar nuestros servicios.
                            </p>

                            <h3>2. Servicios Ofrecidos</h3>
                            <p>
                                Nuestra plataforma facilita el agendamiento de citas médicas, teleconsulta y gestión de espacios terapéuticos. La disponibilidad de los profesionales está sujeta a cambios y confirmación.
                            </p>

                            <h3>3. Agendamiento y Cancelación de Citas</h3>
                            <ul>
                                <li><strong>Reservas:</strong> Las citas deben ser reservadas a través de la plataforma o vía telefónica.</li>
                                <li><strong>Cancelaciones:</strong> Debe notificar la cancelación con al menos 24 horas de antelación para evitar penalizaciones o cobros por inasistencia.</li>
                                <li><strong>Puntualidad:</strong> Se recomienda conectarse o llegar 10 minutos antes de la hora programada.</li>
                            </ul>

                            <h3>4. Uso de la Plataforma</h3>
                            <p>
                                El usuario se compromete a:
                            </p>
                            <ul>
                                <li>Proporcionar información veraz y actualizada.</li>
                                <li>No utilizar la plataforma para fines ilícitos o que atenten contra la seguridad del sistema.</li>
                                <li>Respetar la confidencialidad de los profesionales y otros usuarios.</li>
                            </ul>

                            <h3>5. Pagos y Reembolsos</h3>
                            <p>
                                Los pagos por servicios deben realizarse según las tarifas vigentes. Las políticas de reembolso aplicarán únicamente en casos de fuerza mayor o cancelaciones realizadas dentro del plazo establecido.
                            </p>

                            <h3>6. Limitación de Responsabilidad</h3>
                            <p>
                                El Centro no se hace responsable por interrupciones técnicas del servicio ajenas a nuestro control, ni por el uso indebido de las credenciales de acceso por parte del usuario.
                            </p>

                            <h3>7. Contacto</h3>
                            <p>
                                Para cualquier duda legal o administrativa, puede escribirnos a <strong>Hola@cpo.co</strong> o llamarnos al +57 321 786 10 80.
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

export default Terms;
