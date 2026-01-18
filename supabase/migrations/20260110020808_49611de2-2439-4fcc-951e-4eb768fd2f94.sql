-- Tabla de recordatorios para citas
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT '24h', -- '24h', '2h', etc.
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'sms', 'email'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'confirmed', 'cancelled', 'expired'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  response_at TIMESTAMP WITH TIME ZONE,
  response_action TEXT, -- 'confirm', 'cancel'
  message_content TEXT,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'), -- Token único para respuesta
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_reminders_appointment ON reminders(appointment_id);
CREATE INDEX idx_reminders_status_scheduled ON reminders(status, scheduled_for);
CREATE INDEX idx_reminders_token ON reminders(token);

-- Trigger para updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all reminders"
  ON public.reminders FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can manage reminders"
  ON public.reminders FOR ALL
  USING (has_role(auth.uid(), 'receptionist'));

-- Pacientes pueden ver sus propios recordatorios
CREATE POLICY "Patients can view their reminders"
  ON public.reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN patient_profiles pp ON a.patient_id = pp.id
      WHERE a.id = reminders.appointment_id
        AND pp.user_id = auth.uid()
    )
  );

-- Función para generar recordatorios pendientes (llamada por cron)
CREATE OR REPLACE FUNCTION public.generate_pending_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_count INTEGER := 0;
  apt RECORD;
BEGIN
  -- Buscar citas programadas sin recordatorio 24h
  FOR apt IN
    SELECT a.id, a.start_time, a.patient_id
    FROM appointments a
    WHERE a.status = 'scheduled'
      AND a.start_time > now()
      AND a.start_time <= now() + INTERVAL '25 hours'
      AND NOT EXISTS (
        SELECT 1 FROM reminders r 
        WHERE r.appointment_id = a.id 
          AND r.reminder_type = '24h'
      )
  LOOP
    -- Crear recordatorio 24h antes
    INSERT INTO reminders (
      appointment_id,
      reminder_type,
      channel,
      scheduled_for,
      message_content
    ) VALUES (
      apt.id,
      '24h',
      'whatsapp',
      apt.start_time - INTERVAL '24 hours',
      'Recordatorio: Tiene una cita programada. Responda CONFIRMAR o CANCELAR.'
    );
    reminder_count := reminder_count + 1;
  END LOOP;

  RETURN reminder_count;
END;
$$;

-- Función para procesar respuesta del paciente
CREATE OR REPLACE FUNCTION public.process_reminder_response(
  _token TEXT,
  _action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_record RECORD;
  appointment_record RECORD;
  hours_until_apt NUMERIC;
  result JSONB;
BEGIN
  -- Buscar recordatorio por token
  SELECT * INTO reminder_record
  FROM reminders
  WHERE token = _token AND status = 'sent';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recordatorio no encontrado o ya procesado');
  END IF;

  -- Obtener cita asociada
  SELECT * INTO appointment_record
  FROM appointments
  WHERE id = reminder_record.appointment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cita no encontrada');
  END IF;

  -- Verificar que la cita no esté cancelada
  IF appointment_record.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La cita ya fue cancelada');
  END IF;

  -- Procesar acción
  IF _action = 'confirm' THEN
    -- Confirmar cita
    UPDATE appointments SET status = 'confirmed', updated_at = now()
    WHERE id = appointment_record.id;

    UPDATE reminders SET 
      status = 'confirmed',
      response_at = now(),
      response_action = 'confirm',
      updated_at = now()
    WHERE id = reminder_record.id;

    result := jsonb_build_object('success', true, 'message', 'Cita confirmada exitosamente');

  ELSIF _action = 'cancel' THEN
    -- Verificar política de cancelación (mínimo 3 horas)
    hours_until_apt := EXTRACT(EPOCH FROM (appointment_record.start_time - now())) / 3600;

    IF hours_until_apt < 3 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'No es posible cancelar con menos de 3 horas de anticipación'
      );
    END IF;

    -- Cancelar cita
    UPDATE appointments SET 
      status = 'cancelled',
      cancellation_reason = 'Cancelado por paciente vía recordatorio',
      cancelled_at = now(),
      updated_at = now()
    WHERE id = appointment_record.id;

    UPDATE reminders SET 
      status = 'cancelled',
      response_at = now(),
      response_action = 'cancel',
      updated_at = now()
    WHERE id = reminder_record.id;

    result := jsonb_build_object('success', true, 'message', 'Cita cancelada exitosamente');

  ELSE
    result := jsonb_build_object('success', false, 'error', 'Acción no válida. Use: confirm o cancel');
  END IF;

  RETURN result;
END;
$$;