import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HeartPulse, Thermometer, Activity, Pill, Edit2, Check, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface VitalSignsData {
    blood_type: string | null;
    allergies: string[];
    current_medications: string[];
}

interface VitalSignsCardProps {
    patientId: string;
    data: VitalSignsData;
    onUpdate: () => void;
}

export const VitalSignsCard = ({ patientId, data, onUpdate }: VitalSignsCardProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        blood_type: data.blood_type || "",
        allergies: data.allergies?.join(", ") || "",
        medications: data.current_medications?.join(", ") || ""
    });

    const handleOpen = () => {
        setFormData({
            blood_type: data.blood_type || "",
            allergies: data.allergies?.join(", ") || "",
            medications: data.current_medications?.join(", ") || ""
        });
        setIsOpen(true);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Parse arrays
            const allergiesArray = formData.allergies.split(',').map(s => s.trim()).filter(Boolean);
            const medicationsArray = formData.medications.split(',').map(s => s.trim()).filter(Boolean);

            // 1. Update Profile Data (Blood Type, Allergies)
            const { error: profileError } = await supabase
                .from('patient_profiles')
                .update({
                    blood_type: formData.blood_type,
                    allergies: allergiesArray
                })
                .eq('id', patientId);

            if (profileError) throw profileError;

            // 2. Update Medications in medical_records (Upserting/Updating the latest record or specific logic?)
            // Assumption: Accessing the patient's main medical record summary.
            // Check if a record exists to update, or create one.
            const { data: existingRecord } = await supabase
                .from('medical_records')
                .select('id')
                .eq('patient_id', patientId)
                .maybeSingle();

            if (existingRecord) {
                const { error: medError } = await supabase
                    .from('medical_records')
                    .update({ current_medications: medicationsArray })
                    .eq('id', existingRecord.id);
                if (medError) throw medError;
            } else {
                // Create if doesn't exist (basic init)
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Usuario no autenticado");

                const { error: insertError } = await supabase
                    .from('medical_records')
                    .insert([{
                        patient_id: patientId,
                        current_medications: medicationsArray,
                        created_by: user.id
                    }]);
                if (insertError) throw insertError;
            }

            toast.success("Datos actualizados correctamente");
            setIsOpen(false);
            onUpdate(); // Trigger refresh in parent
        } catch (error: any) {
            console.error("Error updating vitals:", error);
            toast.error(error.message || "Error al actualizar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-md overflow-hidden relative group">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button size="icon" variant="ghost" className="h-8 w-8 bg-white/50 backdrop-blur" onClick={handleOpen}>
                    <Edit2 className="h-4 w-4 text-primary" />
                </Button>
            </div>

            <div className="bg-gradient-to-r from-teal-50 to-teal-100/50 p-4 border-b border-teal-100">
                <h2 className="font-semibold text-teal-800 flex items-center gap-2">
                    <User className="h-5 w-5 text-teal-600" />
                    Resumen del Paciente
                </h2>
            </div>
            <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                    {/* Blood Type */}
                    <div className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={handleOpen}>
                        <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
                            <Thermometer className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grupo Sanguíneo</p>
                            <p className="text-lg font-bold text-secondary mt-1">
                                {data.blood_type || <span className="text-sm font-normal text-gray-400">Sin registrar</span>}
                            </p>
                        </div>
                    </div>

                    {/* Allergies */}
                    <div className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={handleOpen}>
                        <div className="bg-orange-100 p-2 rounded-full text-orange-600 shrink-0">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alergias</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {data.allergies?.length ? (
                                    data.allergies.map((a: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-orange-700 bg-orange-50 border-orange-200 font-normal">
                                            {a}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500 italic">Ninguna conocida</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Medications */}
                    <div className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={handleOpen}>
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                            <Pill className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medicación Actual</p>
                            <div className="flex flex-col gap-2 mt-2">
                                {data.current_medications?.length ? (
                                    data.current_medications.map((m: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-blue-50/50 px-2 py-1 rounded border border-blue-100/50">
                                            <div className="h-1.5 w-1.5 bg-blue-400 rounded-full" />
                                            {m}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500 italic">No hay medicamentos activos</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Edit Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Actualizar Datos Vitales</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="blood_type" className="text-right">
                                Grupo Sanguíneo
                            </Label>
                            <Input
                                id="blood_type"
                                value={formData.blood_type}
                                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                                className="col-span-3"
                                placeholder="Ej: O+"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="allergies" className="text-right pt-2">
                                Alergias
                            </Label>
                            <Textarea
                                id="allergies"
                                value={formData.allergies}
                                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                                className="col-span-3"
                                placeholder="Separadas por comas (Ej: Penicilina, Nueces)"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="medications" className="text-right pt-2">
                                Medicación Actual
                            </Label>
                            <Textarea
                                id="medications"
                                value={formData.medications}
                                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                                className="col-span-3"
                                placeholder="Separados por comas (Ej: Ibuprofeno 400mg, Losartán)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
