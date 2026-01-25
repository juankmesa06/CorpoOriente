import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useMedicalRecords, PatientMedicalHistory } from "@/hooks/useMedicalRecords";
import { MedicalHistoryTimeline } from "@/components/medical-records/MedicalHistoryTimeline";
import { Loader2, FileText, AlertCircle } from "lucide-react";

interface MedicalRecordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string | null;
    patientName?: string;
}

export const MedicalRecordModal = ({ open, onOpenChange, patientId, patientName }: MedicalRecordModalProps) => {
    const { getPatientHistory } = useMedicalRecords();
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<PatientMedicalHistory | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && patientId) {
            setLoading(true);
            setError(null);
            getPatientHistory(patientId)
                .then(setHistory)
                .catch((err) => {
                    console.error("Error fetching history:", err);
                    setError("No se pudo cargar el historial médico.");
                })
                .finally(() => setLoading(false));
        } else if (!open) {
            setHistory(null); // Clear on close
        }
    }, [open, patientId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FileText className="h-5 w-5 text-primary" />
                        Expediente Médico: {patientName || 'Paciente'}
                    </DialogTitle>
                    <DialogDescription>
                        Historial clínico y evoluciones registradas.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-red-500">
                            <AlertCircle className="h-10 w-10 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : history ? (
                        <MedicalHistoryTimeline
                            history={history}
                            isReadOnly={true}
                        />
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p>No se encontraron registros para este paciente.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
