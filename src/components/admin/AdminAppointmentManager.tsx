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
import { CalendarIcon, Check, ChevronsUpDown, DollarSign, UploadCloud, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

export function AdminAppointmentManager() {
    const [patients, setPatients] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState<string>("");
    const [isVirtual, setIsVirtual] = useState(false);
    const [notes, setNotes] = useState("");

    // Payment State
    const [loading, setLoading] = useState(false);
    const [includePayment, setIncludePayment] = useState(false);
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            // Load Patients
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

            // Load Doctors
            const { data: doctorsData } = await supabase
                .from('doctor_profiles')
                .select('id, profiles(full_name), specialty')
                .order('created_at', { ascending: false });

            if (doctorsData) {
                setDoctors(doctorsData.map(d => ({
                    id: d.id,
                    label: `Dr. ${d.profiles?.full_name} - ${d.specialty}`
                })));
            }
        };
        loadData();
    }, []);

    const handleBooking = async () => {
        if (!selectedPatientId || !selectedDoctorId || !date || !time) {
            toast.error("Por favor complete todos los campos obligatorios");
            return;
        }

        setLoading(true);

        try {
            // 1. Create Appointment
            const [hours, minutes] = time.split(':');
            const startTime = new Date(date);
            startTime.setHours(parseInt(hours), parseInt(minutes), 0);

            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 1); // Default 1 hour duration

            const { data: appointment, error: aptError } = await supabase
                .from('appointments')
                .insert({
                    doctor_id: selectedDoctorId,
                    patient_id: selectedPatientId,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'confirmed', // Admin bookings are auto-confirmed usually
                    is_virtual: isVirtual,
                    notes: notes
                })
                .select()
                .single();

            if (aptError) throw aptError;

            // 2. Process Payment if selected
            if (includePayment && appointment) {
                const { error: payError } = await supabase
                    .from('payments')
                    .insert({
                        appointment_id: appointment.id,
                        amount: parseFloat(amount),
                        payment_date: new Date().toISOString(),
                        payment_method: paymentMethod,
                        status: 'completed'
                    });

                if (payError) {
                    toast.error("Cita creada pero error al registrar pago: " + payError.message);
                } else {
                    toast.success("Cita y cobro registrados exitosamente");
                }
            } else {
                toast.success("Cita agendada exitosamente");
            }

            // Reset Form
            setNotes("");
            setTime("");
            setDate(undefined);
            setIncludePayment(false);
            setAmount("");

        } catch (error: any) {
            toast.error("Error al agendar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Gestión de Citas y Cobros</CardTitle>
                <CardDescription>Agende citas para pacientes y registre pagos directamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Patient Selection */}
                    <div className="space-y-2">
                        <Label>Paciente</Label>
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
                    </div>

                    {/* Doctor Selection */}
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
                    {/* Date Selection */}
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
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-2">
                        <Label>Hora (24h)</Label>
                        <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                </div>

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

                {/* Payment Section */}
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 space-y-4">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="includePayment"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={includePayment}
                            onChange={(e) => setIncludePayment(e.target.checked)}
                        />
                        <Label htmlFor="includePayment" className="font-semibold cursor-pointer">Registrar Cobro Inmediato</Label>
                    </div>

                    {includePayment && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label>Monto ($)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="number"
                                        className="pl-9"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Método de Pago</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Efectivo</SelectItem>
                                        <SelectItem value="transfer">Transferencia</SelectItem>
                                        <SelectItem value="card">Tarjeta / Punto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-secondary"
                    size="lg"
                    onClick={handleBooking}
                    disabled={loading}
                >
                    {loading ? <UploadCloud className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    {includePayment ? 'Agendar y Registrar Cobro' : 'Agendar Cita'}
                </Button>

            </CardContent>
        </Card>
    );
}
