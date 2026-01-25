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
import { Loader2, Stethoscope, Activity, FileText, ClipboardList, PenTool } from "lucide-react";
import { CreateEntryInput, MedicalEntry, VitalSigns } from "@/hooks/useMedicalRecords";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  type: z.enum(["consultation", "evolution", "notes"]),
  chief_complaint: z.string().min(1, "El motivo de consulta es requerido"),
  diagnosis: z.string().optional(),
  evolution: z.string().optional(),
  treatment_plan: z.string().optional(),
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
  onSubmit: (data: CreateEntryInput) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<"consultation" | "evolution" | "notes">("consultation");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "consultation",
      chief_complaint: existingEntry?.chief_complaint || "",
      diagnosis: existingEntry?.diagnosis || "",
      evolution: existingEntry?.evolution || "",
      treatment_plan: existingEntry?.treatment_plan || "",
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

    const data: CreateEntryInput = {
      patient_id: patientId,
      appointment_id: appointmentId,
      chief_complaint: values.chief_complaint,
      diagnosis: values.diagnosis || undefined,
      evolution: values.evolution || undefined,
      treatment_plan: values.treatment_plan || undefined,
      observations: values.observations || undefined,
      vital_signs: Object.keys(vital_signs).length > 0 ? vital_signs : undefined,
    };

    await onSubmit(data);
  };

  return (
    <Card className="border-primary/10 shadow-lg bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl text-primary">
          <Stethoscope className="h-6 w-6" />
          {existingEntry ? "Actualizar Entrada Clínica" : "Nueva Entrada Clínica"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-primary/5 p-1 h-auto">
                <TabsTrigger value="consultation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Consulta
                </TabsTrigger>
                <TabsTrigger value="evolution" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                  <Activity className="w-4 h-4 mr-2" />
                  Evolución
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                  <FileText className="w-4 h-4 mr-2" />
                  Notas
                </TabsTrigger>
              </TabsList>

              <div className="space-y-6">
                {/* Common Fields for all tabs (Motivo usually essential) */}
                <FormField
                  control={form.control}
                  name="chief_complaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-secondary font-medium">
                        {activeTab === 'evolution' ? 'Resumen de Evolución' : 'Motivo de Consulta / Título'} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={activeTab === 'evolution' ? "Breve estado del paciente..." : "Dolor de cabeza, Chequeo general..."}
                          className="bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <TabsContent value="consultation" className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Diagnóstico</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Diagnóstico clínico..."
                              className="min-h-[80px] bg-white resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="treatment_plan"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Plan de Tratamiento</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Medicamentos, reposo, indicaciones..."
                              className="min-h-[100px] bg-white resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="evolution" className="space-y-4 animate-in fade-in-50 duration-300">
                  <FormField
                    control={form.control}
                    name="evolution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detalle de Evolución</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Cambios en el estado del paciente, respuesta al tratamiento..."
                            className="min-h-[150px] bg-white resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="notes" className="space-y-4 animate-in fade-in-50 duration-300">
                  <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observaciones Adicionales</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notas privadas, recordatorios..."
                            className="min-h-[150px] bg-white resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>
            </Tabs>

            <Separator className="my-6" />

            {/* Vital Signs - Always visible but collapsible option could be nice. For now just distinct section */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-secondary">
                <Activity className="h-4 w-4 text-primary" />
                Signos Vitales
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onCancel} className="hover:bg-red-50 hover:text-red-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-white min-w-[150px]">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingEntry ? "Guardar Cambios" : "Guardar Entrada"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
