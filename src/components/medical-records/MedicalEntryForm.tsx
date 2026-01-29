import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Stethoscope, Activity, FileText, ClipboardList, PenTool, Pill, Calendar as CalendarIcon } from "lucide-react";
import { CreateEntryInput, MedicalEntry, VitalSigns } from "@/hooks/useMedicalRecords";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DoctorAgendaSelector } from "@/components/appointments/DoctorAgendaSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  type: z.enum(["consultation", "evolution", "notes"]),
  chief_complaint: z.string().min(1, "El motivo de consulta es requerido"),
  diagnosis: z.string().optional(),
  evolution: z.string().optional(),
  treatment_plan: z.string().optional(),
  prescription: z.string().optional(),
  followUpDate: z.string().optional(),
  observations: z.string().optional(),
  blood_pressure: z.string().optional(),
  heart_rate: z.string().optional(),
  temperature: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  oxygen_saturation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MedicalEntryFormProps {
  patientId: string;
  appointmentId?: string;
  existingEntry?: MedicalEntry;
  onSubmit: (data: CreateEntryInput & { followUpDate?: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const MedicalEntryForm = ({
  patientId,
  appointmentId,
  existingEntry,
  onSubmit,
  onCancel,
  isLoading = false
}: MedicalEntryFormProps) => {
  const { user } = useAuth();
  const [showAgenda, setShowAgenda] = useState(false);
  const [wantsFollowUp, setWantsFollowUp] = useState(!!existingEntry?.appointment_date); // or false default


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "consultation",
      chief_complaint: existingEntry?.chief_complaint || "",
      diagnosis: existingEntry?.diagnosis || "",
      evolution: existingEntry?.evolution || "",
      treatment_plan: existingEntry?.treatment_plan || "",
      prescription: "",
      followUpDate: "",
      observations: existingEntry?.observations || "",
      blood_pressure: existingEntry?.vital_signs?.blood_pressure || "",
      heart_rate: existingEntry?.vital_signs?.heart_rate?.toString() || "",
      temperature: existingEntry?.vital_signs?.temperature?.toString() || "",
      weight: existingEntry?.vital_signs?.weight?.toString() || "",
      height: existingEntry?.vital_signs?.height?.toString() || "",
      oxygen_saturation: existingEntry?.vital_signs?.oxygen_saturation?.toString() || "",
    }
  });

  const handleSubmit = async (values: FormValues) => {
    const vital_signs: VitalSigns = {};

    if (values.blood_pressure) vital_signs.blood_pressure = values.blood_pressure;
    if (values.heart_rate) vital_signs.heart_rate = parseInt(values.heart_rate);
    if (values.temperature) vital_signs.temperature = parseFloat(values.temperature);
    if (values.weight) vital_signs.weight = parseFloat(values.weight);
    if (values.height) vital_signs.height = parseFloat(values.height);
    if (values.oxygen_saturation) vital_signs.oxygen_saturation = parseInt(values.oxygen_saturation);

    // Combine treatment plan and prescription if needed, or pass as part of the data
    let treatmentPlanCombined = values.treatment_plan || "";
    if (values.prescription) {
      treatmentPlanCombined += `\n\n[Manejo Farmacológico]\n${values.prescription}`;
    }

    const data: CreateEntryInput & { followUpDate?: string } = {
      patient_id: patientId,
      appointment_id: appointmentId,
      chief_complaint: values.chief_complaint,
      diagnosis: values.diagnosis || undefined,
      evolution: values.evolution || undefined,
      treatment_plan: treatmentPlanCombined || undefined, // Use combined value
      observations: values.observations || undefined,
      vital_signs: Object.keys(vital_signs).length > 0 ? vital_signs : undefined,
      followUpDate: values.followUpDate || undefined
    };

    await onSubmit(data);
  };

  return (
    <Card className="border-teal-100 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-2 border-b border-teal-50">
        <CardTitle className="flex items-center gap-2 text-xl text-teal-700">
          <Stethoscope className="h-6 w-6" />
          {existingEntry ? "Actualizar Registro de Sesión" : "Nueva Sesión Terapéutica"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

            {/* Header Section: Theme */}
            <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <FormField
                control={form.control}
                name="chief_complaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-800 font-semibold flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-teal-600" />
                      Temática Principal / Motivo de Consulta
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Ansiedad generalizada, conflicto familiar relevante..."
                        className="bg-white border-slate-200 focus-visible:ring-teal-500 font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>



            {console.log('Rendering Agenda Selector with doctorId:', user?.id)}
            <DoctorAgendaSelector
              doctorId={user?.id || ''}
              isOpen={showAgenda}
              onClose={() => setShowAgenda(false)}
              onSelectSlot={(date) => {
                form.setValue("followUpDate", date);
                setShowAgenda(false); // Close agenda after selection
              }}
            />

            {/* Narrative Section - The Core of the Session */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="evolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-teal-600" />
                      Desarrollo de la Sesión (Narrativa)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa el desarrollo de la sesión, intervenciones realizadas, respuestas del paciente y eventos significativos..."
                        className="min-h-[200px] bg-white border-slate-200 resize-y focus-visible:ring-teal-500 leading-relaxed"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Clinical Analysis & Plan Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Análisis / Impresión Diagnóstica</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Interpretación clínica, evaluación del estado mental..."
                        className="min-h-[120px] bg-white border-slate-200 resize-none focus-visible:ring-teal-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="treatment_plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Intervención / Tareas / Acuerdos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Técnicas sugeridas, tareas para casa, plan para próxima sesión..."
                          className="min-h-[100px] bg-white border-slate-200 resize-none focus-visible:ring-teal-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                        <Pill className="h-4 w-4 text-teal-600" />
                        Manejo Farmacológico (Receta)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Medicamentos recetados, dosis y frecuencia..."
                          className="min-h-[80px] bg-white border-slate-200 resize-none focus-visible:ring-teal-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Private Notes Section */}
            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100/50">
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-amber-800 font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      Notas Psicoterapéuticas (Privadas)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anotaciones personales, contratransferencia, hipótesis a explorar..."
                        className="min-h-[100px] bg-white border-amber-200/50 focus-visible:ring-amber-500 resize-none placeholder:text-amber-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-6 bg-slate-100" />

            {/* Vital Signs - Softened and Collapsible-ish look */}
            <details className="group bg-slate-50 rounded-lg border border-slate-100 open:bg-white open:shadow-sm transition-all duration-200">
              <summary className="cursor-pointer p-4 flex items-center justify-between text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors list-none">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-500" />
                  Registro Fisiológico (Opcional)
                </span>
                <Stethoscope className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>

              <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-in slide-in-from-top-2">
                <FormField
                  control={form.control}
                  name="blood_pressure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Presión A.</FormLabel>
                      <FormControl>
                        <Input placeholder="120/80" className="h-8 bg-white" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heart_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Frecuencia C.</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="bpm" className="h-8 bg-white" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Temp. (°C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="°C" className="h-8 bg-white" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Peso (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="kg" className="h-8 bg-white" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Altura (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="cm" className="h-8 bg-white" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oxygen_saturation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Sat. O2 (%)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="%" className="h-8 bg-white" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </details>

            {/* Next Appointment Section (Moved to Bottom) */}
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="followup"
                  checked={wantsFollowUp}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setWantsFollowUp(isChecked);
                    if (!isChecked) {
                      form.setValue("followUpDate", "");
                    }
                  }}
                />
                <label
                  htmlFor="followup"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-blue-900"
                >
                  Requiere Seguimiento / Continuar Tratamiento
                </label>
              </div>

              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-blue-800 font-medium flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                      Próxima Sesión
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          value={field.value ? format(new Date(field.value), "EEEE d 'de' MMMM - h:mm a", { locale: es }) : ''}
                          placeholder="Seleccione un horario de la agenda..."
                          readOnly
                          className="bg-white border-blue-200 focus-visible:ring-blue-500 font-medium"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowAgenda(true)}
                        disabled={!wantsFollowUp}
                      >
                        Ver Agenda
                      </Button>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {field.value
                        ? "Cita programada. El paciente recibirá notificación de pago (24h)."
                        : "Seleccione 'Ver Agenda' para buscar disponibilidad."}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
              <Button type="button" variant="ghost" onClick={onCancel} className="text-slate-500 hover:bg-red-50 hover:text-red-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white min-w-[150px] shadow-sm">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingEntry ? "Guardar Sesión" : "Finalizar Sesión"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
