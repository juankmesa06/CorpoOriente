-- Permitir citas para pacientes externos (no registrados en el sistema)
-- Recepción puede agendar con nombre externo cuando el paciente no está en el sistema

-- 1. Agregar columna para nombre de paciente externo
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS external_patient_name TEXT;

-- 2. Hacer patient_id opcional para citas de pacientes externos
ALTER TABLE public.appointments
ALTER COLUMN patient_id DROP NOT NULL;

-- 3. Constraint: debe tener patient_id O external_patient_name
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_patient_or_external CHECK (
  (patient_id IS NOT NULL) OR (external_patient_name IS NOT NULL AND length(trim(external_patient_name)) > 0)
);

COMMENT ON COLUMN public.appointments.external_patient_name IS 'Nombre del paciente cuando es externo (no registrado en el sistema). Usado por recepción para agendar citas sin crear cuenta.';
