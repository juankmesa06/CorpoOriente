import { Navbar } from '@/components/Navbar';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const RentalSpaces = () => {
    return (
        <div className="min-h-screen bg-slate-50/50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 max-w-5xl animate-in fade-in zoom-in duration-500">

                {/* Header Section */}
                <div className="mb-8 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3 justify-center md:justify-start">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                            <Building2 className="h-8 w-8" />
                        </div>
                        Espacios y Salones
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg max-w-2xl">
                        Descubre nuestros salones diseñados para talleres, conferencias y eventos de bienestar.
                        Reserva el espacio ideal para tu próxima actividad.
                    </p>
                </div>

                <Card className="border-none shadow-xl bg-white overflow-hidden">
                    <CardContent className="p-0">
                        <div className="p-6 md:p-8">
                            <RoomRentalBooking />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RentalSpaces;
