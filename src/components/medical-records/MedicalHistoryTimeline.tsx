import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, User, Calendar, Stethoscope, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MedicalEntry, PatientMedicalHistory } from "@/hooks/useMedicalRecords";

interface MedicalHistoryTimelineProps {
  history: PatientMedicalHistory;
  isReadOnly?: boolean;
  onEditEntry?: (entry: MedicalEntry) => void;
}

export const MedicalHistoryTimeline = ({ 
  history, 
  isReadOnly = false,
  onEditEntry 
}: MedicalHistoryTimelineProps) => {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const { medical_record, entries, patient } = history;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sin fecha";
    return format(new Date(dateString), "d 'de' MMMM, yyyy - HH:mm", { locale: es });
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      {/* Patient Info Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{patient.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Edad</p>
              <p className="font-medium">
                {patient.date_of_birth 
                  ? `${calculateAge(patient.date_of_birth)} años`
                  : "No registrada"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Género</p>
              <p className="font-medium capitalize">{patient.gender || "No registrado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alergias</p>
              <div className="flex flex-wrap gap-1">
                {patient.allergies?.length ? (
                  patient.allergies.map((allergy, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {allergy}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Ninguna registrada</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Record Base Info */}
      {medical_record && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Antecedentes Médicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Sangre</p>
                <Badge variant="outline" className="mt-1">
                  {medical_record.blood_type || "No registrado"}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Condiciones Crónicas</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {medical_record.chronic_conditions?.length ? (
                    medical_record.chronic_conditions.map((condition, i) => (
                      <Badge key={i} variant="secondary">{condition}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Ninguna registrada</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medicamentos Actuales</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {medical_record.current_medications?.length ? (
                  medical_record.current_medications.map((med, i) => (
                    <Badge key={i} variant="outline">{med}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Ninguno registrado</span>
                )}
              </div>
            </div>
            {medical_record.surgical_history?.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Historial Quirúrgico</p>
                <ul className="list-disc list-inside mt-1 text-sm">
                  {medical_record.surgical_history.map((surgery, i) => (
                    <li key={i}>{surgery}</li>
                  ))}
                </ul>
              </div>
            )}
            {medical_record.family_history && (
              <div>
                <p className="text-sm text-muted-foreground">Antecedentes Familiares</p>
                <p className="text-sm mt-1">{medical_record.family_history}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clinical Entries Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Historial de Consultas
            <Badge variant="secondary">{entries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay entradas clínicas registradas</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              {entries.map((entry, index) => (
                <div key={entry.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  
                  <Card 
                    className={`cursor-pointer transition-shadow hover:shadow-md ${
                      expandedEntry === entry.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setExpandedEntry(
                      expandedEntry === entry.id ? null : entry.id
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDate(entry.appointment_date || entry.created_at)}
                            </span>
                            {entry.version > 1 && (
                              <Badge variant="outline" className="text-xs">
                                v{entry.version}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{entry.chief_complaint}</p>
                          <p className="text-sm text-muted-foreground">
                            Dr. {entry.doctor.name} - {entry.doctor.specialty}
                          </p>
                        </div>
                        {!isReadOnly && onEditEntry && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEntry(entry);
                            }}
                            className="text-sm text-primary hover:underline"
                          >
                            Editar
                          </button>
                        )}
                      </div>

                      {expandedEntry === entry.id && (
                        <>
                          <Separator className="my-4" />
                          <div className="space-y-3">
                            {entry.diagnosis && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Diagnóstico</p>
                                <p className="text-sm">{entry.diagnosis}</p>
                              </div>
                            )}
                            {entry.evolution && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Evolución</p>
                                <p className="text-sm">{entry.evolution}</p>
                              </div>
                            )}
                            {entry.treatment_plan && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Plan de Tratamiento</p>
                                <p className="text-sm">{entry.treatment_plan}</p>
                              </div>
                            )}
                            {entry.observations && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Observaciones</p>
                                <p className="text-sm">{entry.observations}</p>
                              </div>
                            )}
                            {entry.vital_signs && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Signos Vitales</p>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                  {entry.vital_signs.blood_pressure && (
                                    <Badge variant="outline">PA: {entry.vital_signs.blood_pressure}</Badge>
                                  )}
                                  {entry.vital_signs.heart_rate && (
                                    <Badge variant="outline">FC: {entry.vital_signs.heart_rate} bpm</Badge>
                                  )}
                                  {entry.vital_signs.temperature && (
                                    <Badge variant="outline">Temp: {entry.vital_signs.temperature}°C</Badge>
                                  )}
                                  {entry.vital_signs.weight && (
                                    <Badge variant="outline">Peso: {entry.vital_signs.weight} kg</Badge>
                                  )}
                                  {entry.vital_signs.oxygen_saturation && (
                                    <Badge variant="outline">SpO2: {entry.vital_signs.oxygen_saturation}%</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
