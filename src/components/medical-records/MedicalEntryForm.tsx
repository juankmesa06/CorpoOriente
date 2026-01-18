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
import { Loader2, Stethoscope, Activity } from "lucide-react";
import { CreateEntryInput, MedicalEntry, VitalSigns } from "@/hooks/useMedicalRecords";

const formSchema = z.object({
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
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          {existingEntry ? "Actualizar Entrada Clínica" : "Nueva Entrada Clínica"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Main Clinical Fields */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="chief_complaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de Consulta *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describa el motivo principal de la consulta..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnóstico</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Diagnóstico clínico..."
                        className="min-h-[60px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evolución</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Evolución del paciente..."
                        className="min-h-[60px]"
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
                  <FormItem>
                    <FormLabel>Plan de Tratamiento</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tratamiento indicado, medicamentos, indicaciones..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observaciones adicionales..."
                        className="min-h-[60px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Vital Signs */}
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4" />
                Signos Vitales
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="blood_pressure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presión Arterial</FormLabel>
                      <FormControl>
                        <Input placeholder="120/80" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heart_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frecuencia Cardíaca (bpm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="72" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperatura (°C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="36.5" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="70" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="170" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oxygen_saturation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saturación O2 (%)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="98" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingEntry ? "Guardar Cambios" : "Crear Entrada"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
