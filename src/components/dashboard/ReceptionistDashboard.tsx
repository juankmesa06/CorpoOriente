import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';

const ReceptionistDashboard = () => {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Recepción
                    </CardTitle>
                    <CardDescription>Agenda citas y gestiona pacientes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">Nueva cita</Button>
                    <Button variant="outline" className="w-full justify-start">Registrar paciente</Button>
                    <Button variant="outline" className="w-full justify-start">Ver agenda del día</Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReceptionistDashboard;
