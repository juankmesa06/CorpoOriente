import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText, User, Calendar, Stethoscope, AlertCircle,
  Pill, CalendarDays, History, Clock, Video, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MedicalEntry, PatientMedicalHistory } from "@/hooks/useMedicalRecords";
import { cn } from "@/lib/utils";

interface MedicalHistoryTimelineProps {
  history: PatientMedicalHistory | null;
  upcoming?: any[];
  isReadOnly?: boolean;
  onEditEntry?: (entry: MedicalEntry) => void;
}

export const MedicalHistoryTimeline = ({
  history,
  isReadOnly = false,
  onEditEntry,
  upcoming = []
}: MedicalHistoryTimelineProps) => {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const entries = history?.entries || [];
  const patient = history?.patient;

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

  if (!history && upcoming.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <FileText className="h-10 w-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Sin Historial</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 font-medium">
          No se encontró historial médico ni citas programadas para este paciente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Próximas Citas - Diseño Premium */}
      {upcoming.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-200">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Próximas Citas</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Agenda Programada</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((appt) => (
              <div key={appt.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-teal-100 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-teal-100 transition-colors" />

                <div className="relative flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-teal-50 text-teal-700 border-teal-100 text-[9px] font-black shadow-none px-2 py-0.5">
                        CONFIRMADA
                      </Badge>
                      <Badge className="bg-slate-50 text-slate-600 border-slate-100 text-[9px] font-black shadow-none px-2 py-0.5">
                        {appt.is_virtual ? 'VIRTUAL' : 'PRESENCIAL'}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-lg font-black text-slate-900 leading-tight">
                        {format(new Date(appt.start_time), 'EEEE d, MMMM', { locale: es })}
                      </p>
                      <p className="text-3xl font-black text-teal-600 tracking-tighter mt-1">
                        {format(new Date(appt.start_time), 'HH:mm')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-white shadow-sm text-slate-400">
                        {appt.doctor_profiles?.profiles?.avatar_url ? (
                          <img src={appt.doctor_profiles.profiles.avatar_url} alt="Doctor" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialista</p>
                        <p className="text-xs font-bold text-slate-800 leading-none">
                          Dr. {appt.doctor_profiles?.profiles?.full_name || 'Sin Asignar'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-12 w-12 rounded-[1.25rem] bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-200 group-hover:scale-110 transition-transform group-hover:bg-teal-600 group-hover:shadow-teal-200">
                    {appt.is_virtual ? <Video className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial Clínico - Línea de Tiempo Profesional */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
            <History className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Evolución Clínica</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Historial de Consultas</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px] font-black shadow-none px-3">
              {entries.length} ENTRADAS
            </Badge>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No hay registros clínicos</p>
          </div>
        ) : (
          <div className="relative space-y-4">
            {/* Línea central (decorativa) */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-100 to-transparent" />

            {entries.map((entry) => (
              <div key={entry.id} className="relative pl-14 group">
                {/* Dot de la línea de tiempo */}
                <div className="absolute left-[30px] top-6 w-1 h-1 rounded-full bg-slate-400 ring-4 ring-white shadow-[0_0_0_8px_rgba(241,245,249,1)] z-10 group-hover:bg-teal-500 group-hover:ring-teal-50 transition-all" />

                <Card
                  className={cn(
                    "border-slate-100 shadow-xl shadow-slate-200/30 rounded-[2rem] transition-all duration-500 cursor-pointer hover:border-teal-200 group-hover:shadow-2xl group-hover:shadow-slate-200/50",
                    expandedEntry === entry.id ? "ring-2 ring-teal-500 border-transparent" : ""
                  )}
                  onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                            <Calendar className="h-3 w-3" />
                            <span className="text-[10px] font-black uppercase tracking-wider">
                              {formatDate(entry.appointment_date || entry.created_at)}
                            </span>
                          </div>
                          {entry.version > 1 && (
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-400">
                              V{entry.version}
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-base font-black text-slate-900 group-hover:text-teal-600 transition-colors">
                          {entry.chief_complaint}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-white shadow-sm text-slate-400 shrink-0">
                            {entry.doctor.photo_url ? (
                              <img src={entry.doctor.photo_url} alt="Doctor" className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Por: Dr. {entry.doctor.name} • {entry.doctor.specialty}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all",
                        expandedEntry === entry.id ? "rotate-90 bg-teal-50 text-teal-600" : ""
                      )}>
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>

                    {expandedEntry === entry.id && (
                      <div className="mt-6 pt-6 border-t border-slate-50 space-y-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {entry.diagnosis && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Diagnóstico</p>
                              </div>
                              <p className="text-sm font-bold text-slate-800 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                {entry.diagnosis}
                              </p>
                            </div>
                          )}
                          {entry.evolution && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Evolución</p>
                              </div>
                              <p className="text-sm font-bold text-slate-700 leading-relaxed italic border-l-4 border-blue-100 pl-4 py-1">
                                {entry.evolution}
                              </p>
                            </div>
                          )}
                        </div>

                        {entry.treatment_plan && (() => {
                          const parts = entry.treatment_plan.split('[Manejo Farmacológico]');
                          const plan = parts[0].trim();
                          const prescription = parts.length > 1 ? parts[1].trim() : null;
                          return (
                            <div className="space-y-6">
                              {plan && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Plan de Tratamiento</p>
                                  </div>
                                  <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                    {plan}
                                  </p>
                                </div>
                              )}
                              {prescription && (
                                <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                  <div className="relative flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                      <Pill className="h-5 w-5 text-teal-400" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Prescripción Médica</p>
                                      <p className="text-xs font-bold text-white uppercase tracking-widest">Manejo Farmacológico</p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-300 leading-loose whitespace-pre-wrap font-medium">
                                    {prescription}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {entry.vital_signs && (
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                              <Stethoscope className="h-4 w-4 text-slate-400" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Signos Vitales Tomados</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {entry.vital_signs.blood_pressure && (
                                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">
                                  PA: <span className="text-teal-600">{entry.vital_signs.blood_pressure}</span>
                                </div>
                              )}
                              {entry.vital_signs.heart_rate && (
                                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">
                                  FC: <span className="text-rose-600">{entry.vital_signs.heart_rate} bpm</span>
                                </div>
                              )}
                              {entry.vital_signs.temperature && (
                                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">
                                  TEMP: <span className="text-amber-600">{entry.vital_signs.temperature}°C</span>
                                </div>
                              )}
                              {entry.vital_signs.weight && (
                                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">
                                  PESO: <span className="text-blue-600">{entry.vital_signs.weight} kg</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
