import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DollarSign, CheckCircle2, Clock, AlertCircle, Calendar as CalendarIcon,
    User, List, PlusCircle, Stethoscope, Check, ChevronsUpDown, Loader2, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

export function AdminAppointmentBooking({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
    const [patients, setPatients] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [isExternalPatient, setIsExternalPatient] = useState(false);
    const [externalPatientName, setExternalPatientName] = useState("");
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState<string>("");
    const [isVirtual, setIsVirtual] = useState(false);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
    const [fetchingAppointments, setFetchingAppointments] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [doctorOccupiedSlots, setDoctorOccupiedSlots] = useState<{ start: string; end: string }[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const { data: patientsData } = await supabase
                .from('patient_profiles')
                .select('id, user_id, profiles(full_name, email)')
                .order('created_at', { ascending: false });

            if (patientsData) {
                setPatients(patientsData.map(p => ({
                    id: p.id,
                    label: p.profiles?.full_name || 'Sin nombre',
                    email: p.profiles?.email
                })));
            }

            const { data: doctorsData, error: doctorsError } = await supabase
                .from('doctor_profiles')
                .select('id, user_id, specialty')
                .order('created_at', { ascending: false });

            if (doctorsError) {
                console.error('Doctors Error:', doctorsError);
                toast.error(`Error cargando doctores: ${doctorsError.message}`);
            }

            if (doctorsData) {
                const doctorUserIds = doctorsData.map(d => d.user_id);
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .in('user_id', doctorUserIds);

                setDoctors(doctorsData.map(d => {
                    const profile = profilesData?.find(p => p.user_id === d.user_id);
                    return {
                        id: d.id,
                        label: `Dr. ${profile?.full_name || 'Desconocido'} - ${d.specialty}`
                    };
                }));
            }

            fetchAppointments();
        };
        loadData();
    }, []);

    const fetchAppointments = async () => {
        setFetchingAppointments(true);
        try {
            let query = supabase
                .from('appointments')
                .select(`
                    id,
                    start_time,
                    status,
                    is_virtual,
                    patient_id,
                    external_patient_name,
                    doctor_id,
                    patient_profiles (
                        user_id
                    ),
                    doctor_profiles (
                        user_id
                    ),
                    payments (
                        amount,
                        status
                    )
                `)
                .order('start_time', { ascending: false })
                .limit(30);

            if (typeFilter === "virtual") query = query.eq('is_virtual', true);
            if (typeFilter === "presencial") query = query.eq('is_virtual', false);

            const { data: appointments, error } = await query;

            if (error) throw error;

            if (!appointments) {
                setAppointmentsList([]);
                return;
            }

            // Extract user IDs for patients and doctors
            const patientUserIds = appointments.map((a: any) => a.patient_profiles?.user_id).filter(Boolean);
            const doctorUserIds = appointments.map((a: any) => a.doctor_profiles?.user_id).filter(Boolean);
            const allUserIds = [...new Set([...patientUserIds, ...doctorUserIds])];

            // Fetch profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', allUserIds);

            const processedAppointments = appointments.map((apt: any) => {
                const patientUserId = apt.patient_profiles?.user_id;
                const doctorUserId = apt.doctor_profiles?.user_id;

                const patientProfile = profiles?.find(p => p.user_id === patientUserId);
                const doctorProfile = profiles?.find(p => p.user_id === doctorUserId);

                return {
                    ...apt,
                    patient_profiles: {
                        profiles: patientProfile ? { full_name: patientProfile.full_name } : undefined
                    },
                    // Paciente externo: usar external_patient_name cuando patient_id es null
                    displayPatientName: apt.external_patient_name || (patientProfile ? patientProfile.full_name : undefined),
                    doctor_profiles: {
                        profiles: doctorProfile ? { full_name: doctorProfile.full_name } : undefined
                    }
                };
            });

            setAppointmentsList(processedAppointments);
        } catch (error: any) {
            console.error('Error fetching appointments:', error);
            toast.error("Error al cargar citas: " + error.message);
        } finally {
            setFetchingAppointments(false);
        }
    };

    const checkAvailability = async () => {
        if (!selectedDoctorId || !date || !time) return;

        setCheckingAvailability(true);
        setIsAvailable(null);

        try {
            const [hours, minutes] = time.split(':');
            const startTime = new Date(date);
            startTime.setHours(parseInt(hours), parseInt(minutes), 0);

            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 1);

            const { data, error } = await supabase.rpc('check_doctor_availability', {
                _doctor_id: selectedDoctorId,
                _start_time: startTime.toISOString(),
                _end_time: endTime.toISOString()
            });

            if (error) throw error;
            setIsAvailable(data);

            if (!data) {
                toast.warning("El doctor ya tiene una cita en ese horario");
            }

        } catch (error) {
            console.error(error);
        } finally {
            setCheckingAvailability(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [typeFilter]);

    useEffect(() => {
        checkAvailability();
    }, [selectedDoctorId, date, time]);

    // Cargar horarios ocupados del médico cuando hay doctor y fecha
    useEffect(() => {
        const loadDoctorSlots = async () => {
            if (!selectedDoctorId || !date) {
                setDoctorOccupiedSlots([]);
                return;
            }
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const { data } = await supabase
                .from('appointments')
                .select('start_time, end_time')
                .eq('doctor_id', selectedDoctorId)
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString())
                .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed']);
            setDoctorOccupiedSlots((data || []).map(a => ({
                start: format(new Date(a.start_time), 'HH:mm'),
                end: format(new Date(a.end_time), 'HH:mm')
            })));
        };
        loadDoctorSlots();
    }, [selectedDoctorId, date]);

    const handleBooking = async () => {
        const hasPatient = isExternalPatient
            ? (externalPatientName?.trim()?.length ?? 0) > 0
            : !!selectedPatientId;
        if (!hasPatient || !selectedDoctorId || !date || !time) {
            toast.error(isExternalPatient
                ? "Por favor ingrese el nombre del paciente externo y complete todos los campos"
                : "Por favor complete todos los campos obligatorios");
            return;
        }

        if (isAvailable === false) {
            toast.error("El doctor no está disponible en este horario");
            return;
        }

        setLoading(true);

        try {
            const [hours, minutes] = time.split(':');
            const startTime = new Date(date);
            startTime.setHours(parseInt(hours), parseInt(minutes), 0);

            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 1);

            const { data: apt, error: aptError } = await supabase
                .from('appointments')
                .insert({
                    doctor_id: selectedDoctorId,
                    patient_id: selectedPatientId,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'confirmed',
                    is_virtual: isVirtual,
                    notes: notes
                })
                .select()
                .single();

            // 2. Get Doctor's Fee for the payment
            const { data: docProfile } = await supabase
                .from('doctor_profiles')
                .select('consultation_fee, consultation_fee_virtual')
                .eq('id', selectedDoctorId)
                .single();

            const finalAmount = isVirtual
                ? (docProfile?.consultation_fee_virtual || docProfile?.consultation_fee || 0)
                : (docProfile?.consultation_fee || 0);

            // Ensure payment record exists and is marked as paid
            await supabase
                .from('payments')
                .upsert({
                    appointment_id: apt.id,
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    amount: finalAmount,
                    currency: 'COP'
                }, { onConflict: 'appointment_id' });

            toast.success("Cita agendada y pagada exitosamente");

            setNotes("");
            setTime("");
            setDate(undefined);
            setSelectedPatientId("");
            setIsExternalPatient(false);
            setExternalPatientName("");
            setSelectedDoctorId("");
            fetchAppointments();

        } catch (error: any) {
            toast.error("Error al agendar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'completed':
            case 'COMPLETED':
                return <Badge className="bg-green-50 text-green-700 border-green-200">Confirmada</Badge>;
            case 'pending': return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPaymentBadge = (payment: any) => {
        const p = payment && payment[0];
        const amount = p ? p.amount : 0;

        return (
            <div className="flex flex-col gap-1">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 w-fit">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Pagado
                </Badge>
                <span className="text-[10px] font-bold text-slate-700">{(amount || 0).toLocaleString()} COP</span>
            </div>
        );
    };

    return (
        <Tabs defaultValue={isSuperAdmin ? "list" : "booking"} className="w-full">
            <div className="flex items-center justify-between mb-4">
                <TabsList>
                    <TabsTrigger value="list" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        Listado de Citas
                    </TabsTrigger>
                    {!isSuperAdmin && (
                        <TabsTrigger value="booking" className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" />
                            Agendar Cita
                        </TabsTrigger>
                    )}
                </TabsList>
                <div className="flex items-center gap-4">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[180px] h-8 bg-white">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            <SelectItem value="presencial">Presencial</SelectItem>
                            <SelectItem value="virtual">Virtual</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* <Button variant="outline" size="sm" onClick={fetchAppointments} disabled={fetchingAppointments} className="h-8">
                        <Loader2 className={cn("h-4 w-4 mr-2", fetchingAppointments && "animate-spin")} />
                        Actualizar
                    </Button> */}
                </div>
            </div>

            <TabsContent value="list">
                <Card>
                    <CardHeader>
                        <CardTitle>Control de Citas</CardTitle>
                        <CardDescription>Seguimiento de las consultas agendadas y su estado financiero.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha / Hora</TableHead>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Doctor</TableHead>
                                    <TableHead>Estado Cita</TableHead>
                                    <TableHead>Pago / Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fetchingAppointments ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">Cargando citas...</TableCell>
                                    </TableRow>
                                ) : appointmentsList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No se encontraron citas</TableCell>
                                    </TableRow>
                                ) : (
                                    appointmentsList.map((apt) => (
                                        <TableRow key={apt.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{format(new Date(apt.start_time), "PPP", { locale: es })}</span>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(apt.start_time), "HH:mm")}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    {apt.patient_profiles?.profiles?.full_name || 'Desconocido'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Stethoscope className="h-4 w-4 text-primary" />
                                                    {apt.doctor_profiles?.profiles?.full_name || 'Desconocido'}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(apt.status)}</TableCell>
                                            <TableCell>{getPaymentBadge(apt.payments)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            {!isSuperAdmin && (
                <TabsContent value="booking">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agendamiento de Citas</CardTitle>
                            <CardDescription>Programe nuevas consultas para los pacientes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Paciente</Label>
                                    <div className="flex gap-2 mb-2">
                                        <Button
                                            type="button"
                                            variant={!isExternalPatient ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => { setIsExternalPatient(false); setExternalPatientName(""); }}
                                        >
                                            <User className="h-4 w-4 mr-1" />
                                            En sistema
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={isExternalPatient ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => { setIsExternalPatient(true); setSelectedPatientId(""); }}
                                        >
                                            <UserPlus className="h-4 w-4 mr-1" />
                                            Paciente externo
                                        </Button>
                                    </div>
                                    {isExternalPatient ? (
                                        <Input
                                            placeholder="Nombre completo del paciente externo"
                                            value={externalPatientName}
                                            onChange={(e) => setExternalPatientName(e.target.value)}
                                        />
                                    ) : (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                                    {selectedPatientId
                                                        ? patients.find((p) => p.id === selectedPatientId)?.label
                                                        : "Seleccionar paciente..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Buscar paciente..." />
                                                    <CommandList>
                                                        <CommandEmpty>No encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {patients.map((patient) => (
                                                                <CommandItem
                                                                    key={patient.id}
                                                                    value={patient.label}
                                                                    onSelect={() => setSelectedPatientId(patient.id)}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedPatientId === patient.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{patient.label}</span>
                                                                        <span className="text-xs text-muted-foreground">{patient.email}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Doctor / Especialista</Label>
                                    <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar doctor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctors.map((doc) => (
                                                <SelectItem key={doc.id} value={doc.id}>{doc.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 flex flex-col">
                                    <Label>Fecha</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !date && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date ? format(date, "PPP", { locale: es }) : <span>Elegir fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)] sm:max-w-none">
                                            <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 flex justify-center">
                                                <Calendar
                                                    mode="single"
                                                    selected={date}
                                                    onSelect={setDate}
                                                    initialFocus
                                                    className="min-w-[280px] mx-auto"
                                                />
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>Hora (24h)</Label>
                                    <Input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            {selectedDoctorId && date && (
                                <div className="space-y-3">
                                    {doctorOccupiedSlots.length > 0 && (
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                            <p className="text-xs font-medium text-slate-600 mb-2">Horarios ocupados hoy:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {doctorOccupiedSlots.map((slot, i) => (
                                                    <Badge key={i} variant="secondary" className="font-mono text-xs">
                                                        {slot.start} - {slot.end}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {time && (
                                        <div className={`p-4 rounded-lg flex items-center gap-2 ${checkingAvailability ? 'bg-muted' :
                                            isAvailable ? 'bg-green-50 text-green-700 border border-green-200' :
                                                'bg-red-50 text-red-700 border border-red-200'
                                            }`}>
                                            {checkingAvailability ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span className="text-sm">Verificando disponibilidad...</span>
                                                </>
                                            ) : isAvailable ? (
                                                <>
                                                    <Check className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Doctor disponible en este horario</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Doctor ocupado en este horario</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Tipo de Cita</Label>
                                    <Select value={isVirtual ? "virtual" : "presencial"} onValueChange={(v) => setIsVirtual(v === "virtual")}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="presencial">Presencial</SelectItem>
                                            <SelectItem value="virtual">Virtual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Notas</Label>
                                    <Input
                                        placeholder="Motivo de consulta..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            <Button
                                className="w-full bg-primary hover:bg-primary/90"
                                size="lg"
                                onClick={handleBooking}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                Confirmar Cita
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            )}
        </Tabs>
    );
}
