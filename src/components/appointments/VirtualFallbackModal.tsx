
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Video } from "lucide-react";

interface VirtualFallbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    onCancel: () => void;
    doctorName?: string;
    virtualPrice?: number;
}

export function VirtualFallbackModal({
    open,
    onOpenChange,
    onConfirm,
    onCancel,
    doctorName,
    virtualPrice,
}: VirtualFallbackModalProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        No hay consultorios disponibles
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            Lo sentimos, no hay consultorios físicos disponibles para el horario seleccionado con {doctorName || 'el doctor'}.
                        </p>
                        <p className="font-medium text-slate-800">
                            ¿Deseas tomar esta cita de manera virtual?
                        </p>
                        <p className="text-sm text-muted-foreground bg-slate-50 p-2 rounded-md border border-slate-100">
                            La consulta virtual se realiza a través de videollamada segura y tiene un costo {virtualPrice ? `de $${virtualPrice}` : 'preferencial'}.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-primary hover:bg-primary/90">
                        Sí, cambiar a Virtual
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
