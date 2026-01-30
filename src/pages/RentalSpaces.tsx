import { Navbar } from '@/components/Navbar';
import { RoomRentalBooking } from '@/components/rental/RoomRentalBooking';
import { MyRentalsList } from '@/components/rental/MyRentalsList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from 'lucide-react';

const RentalSpaces = () => {
    return (
        <div className="min-h-screen bg-slate-50/50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 max-w-5xl animate-in fade-in zoom-in duration-500">

                {/* Header Section */}
                <div className="mb-8 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3 justify-center md:justify-start">
                        <div className="p-2 bg-teal-100 rounded-xl text-teal-600">
                            <Building2 className="h-8 w-8" />
                        </div>
                        Espacios y Salones
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg max-w-2xl">
                        Descubre nuestros salones diseñados para talleres, conferencias y eventos de bienestar.
                        Reserva el espacio ideal para tu próxima actividad.
                    </p>
                </div>

                <Tabs defaultValue="booking" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-white p-1 shadow-sm rounded-xl">
                        <TabsTrigger
                            value="booking"
                            className="rounded-lg data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-medium py-2"
                        >
                            Reservar Espacio
                        </TabsTrigger>
                        <TabsTrigger
                            value="my-rentals"
                            className="rounded-lg data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-medium py-2"
                        >
                            Mis Reservas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="booking" className="mt-0">
                        <Card className="border-none shadow-xl bg-white overflow-hidden">
                            <CardContent className="p-0">
                                <div className="p-6 md:p-8">
                                    <RoomRentalBooking />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="my-rentals" className="mt-0">
                        <Card className="border-none shadow-xl bg-white overflow-hidden min-h-[500px]">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6">
                                <CardTitle className="text-xl text-slate-800">Historial de Reservas</CardTitle>
                                <CardDescription>Gestiona tus espacios alquilados y revisa el estado de tus pagos.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8">
                                <MyRentalsList />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default RentalSpaces;
