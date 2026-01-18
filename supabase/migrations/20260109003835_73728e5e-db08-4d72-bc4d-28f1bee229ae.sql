-- Tabla de citas médicas
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  is_virtual BOOLEAN NOT NULL DEFAULT false,
  meeting_url TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_appointments_doctor_time ON public.appointments(doctor_id, start_time);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Trigger para updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can manage appointments"
  ON public.appointments FOR ALL
  USING (has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Doctors can view their appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctor_profiles dp
      WHERE dp.id = appointments.doctor_id
      AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can update their appointments"
  ON public.appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM doctor_profiles dp
      WHERE dp.id = appointments.doctor_id
      AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patient_profiles pp
      WHERE pp.id = appointments.patient_id
      AND pp.user_id = auth.uid()
    )
  );

-- Función para verificar disponibilidad de horario
CREATE OR REPLACE FUNCTION public.check_appointment_availability(
  _doctor_id UUID,
  _start_time TIMESTAMP WITH TIME ZONE,
  _end_time TIMESTAMP WITH TIME ZONE,
  _exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE doctor_id = _doctor_id
    AND status NOT IN ('cancelled', 'no_show')
    AND (_exclude_appointment_id IS NULL OR id != _exclude_appointment_id)
    AND (
      (start_time <= _start_time AND end_time > _start_time)
      OR (start_time < _end_time AND end_time >= _end_time)
      OR (start_time >= _start_time AND end_time <= _end_time)
    );
  
  RETURN conflict_count = 0;
END;
$$;

-- Función para verificar relación médico-paciente
CREATE OR REPLACE FUNCTION public.check_doctor_patient_relationship(
  _doctor_id UUID,
  _patient_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_id = _doctor_id
      AND patient_id = _patient_id
      AND status = 'active'
  );
END;
$$;