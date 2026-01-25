import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Search, Calendar, FileText, ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface PatientActive {
    id: string;
    name: string;
    email: string | null;
    avatar_url: string | null;
    age: number | null;
    nextAppointment: string | null;
    lastAppointment: string | null;
    status: 'active' | 'inactive';
}

interface DoctorActivePatientsProps {
    onSelectPatient: (patientId: string) => void;
}

export const DoctorActivePatients = ({ onSelectPatient }: DoctorActivePatientsProps) => {
    const { user } = useAuth();
    const [patients, setPatients] = useState<PatientActive[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            loadPatients();
        }
    }, [user]);

    const loadPatients = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase.rpc('get_doctor_patients_list');

            if (error) throw error;

            if (data) {
                const mappedPatients = data.map((item: any) => ({
                    id: item.pt_id,
                    name: item.pt_name,
                    email: item.pt_email,
                    avatar_url: item.pt_avatar_url,
                    age: item.pt_dob ? differenceInYears(new Date(), new Date(item.pt_dob)) : null,
                    nextAppointment: item.next_appt,
                    lastAppointment: item.last_appt,
                    status: item.pt_status as 'active' | 'inactive'
                }));

                // Sort: Next appointment first
                mappedPatients.sort((a: any, b: any) => {
                    if (a.nextAppointment && !b.nextAppointment) return -1;
                    if (!a.nextAppointment && b.nextAppointment) return 1;
                    if (a.nextAppointment && b.nextAppointment) return new Date(a.nextAppointment).getTime() - new Date(b.nextAppointment).getTime();
                    return 0;
                });

                setPatients(mappedPatients);
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
                <h3 className="text-secondary font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" /> Gestión de Pacientes
                </h3>
                <Badge variant="secondary" className="text-xs">
                    {patients.length} Activos
                </Badge>
            </div>

            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 bg-gray-50/50"
                />
            </div>

            <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                    <p className="text-xs text-center text-muted-foreground py-4">Cargando...</p>
                ) : filteredPatients.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-4">No se encontraron pacientes activos.</p>
                ) : (
                    <div className="space-y-3">
                        {filteredPatients.map((patient) => (
                            <div key={patient.id} className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 bg-white shadow-sm group">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 overflow-hidden">
                                        <Avatar className="h-10 w-10 mt-1 cursor-pointer transition-transform hover:scale-105" onClick={() => onSelectPatient(patient.id)}>
                                            <AvatarImage src={patient.avatar_url || ''} />
                                            <AvatarFallback className="text-sm bg-primary/10 text-primary">
                                                {patient.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 space-y-1">
                                            <div>
                                                <p
                                                    className="text-sm font-semibold truncate text-gray-900 cursor-pointer hover:text-primary transition-colors"
                                                    onClick={() => onSelectPatient(patient.id)}
                                                >
                                                    {patient.name}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    {patient.age && (
                                                        <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                            <User className="h-3 w-3" /> {patient.age} años
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {patient.nextAppointment ? (
                                                <p className="text-xs font-medium text-green-600 flex items-center gap-1.5 mt-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Próxima: {format(new Date(patient.nextAppointment), "d MMM, HH:mm", { locale: es })}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                                    <FileText className="h-3 w-3" />
                                                    {patient.lastAppointment ? `Última: ${format(new Date(patient.lastAppointment), "d MMM", { locale: es })}` : 'Sin citas recientes'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Link to={`/medical-record?id=${patient.id}`} title="Ver Historial Médico Completo">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onSelectPatient(patient.id)}
                                            title="Ver Detalles Rápidos"
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};
