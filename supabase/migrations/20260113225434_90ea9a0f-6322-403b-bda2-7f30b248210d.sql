-- Crear enum para estado de pago
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'credit');

-- Crear tabla de pagos
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT, -- 'cash', 'card', 'transfer', 'gateway' (preparado para futuro)
  transaction_id TEXT, -- Para futura pasarela
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID, -- Quién marcó el pago (recepción/admin)
  notes TEXT,
  credit_from_appointment_id UUID, -- Si es crédito de cancelación
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_paid_at ON public.payments(paid_at);

-- Trigger para updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Admins pueden gestionar todos los pagos
CREATE POLICY "Admins can manage all payments"
  ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Recepcionistas pueden gestionar pagos
CREATE POLICY "Receptionists can manage payments"
  ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'receptionist'));

-- Pacientes solo pueden ver sus propios pagos
CREATE POLICY "Patients can view their own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN patient_profiles pp ON a.patient_id = pp.id
      WHERE a.id = payments.appointment_id
        AND pp.user_id = auth.uid()
    )
  );

-- Función para crear pago automáticamente al crear cita
CREATE OR REPLACE FUNCTION public.create_payment_for_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO payments (appointment_id, amount)
  VALUES (NEW.id, 500.00); -- Monto base configurable
  RETURN NEW;
END;
$$;

-- Trigger para crear pago al crear cita
CREATE TRIGGER create_payment_on_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payment_for_appointment();

-- Función para verificar si el pago está completado
CREATE OR REPLACE FUNCTION public.check_payment_status(_appointment_id UUID)
RETURNS payment_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM payments WHERE appointment_id = _appointment_id
$$;

-- Función para procesar pago manual
CREATE OR REPLACE FUNCTION public.process_manual_payment(
  _appointment_id UUID,
  _payment_method TEXT,
  _amount DECIMAL DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record RECORD;
  result JSONB;
BEGIN
  -- Obtener pago existente
  SELECT * INTO payment_record
  FROM payments
  WHERE appointment_id = _appointment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado');
  END IF;

  -- Verificar que no esté ya pagado
  IF payment_record.status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El pago ya fue procesado');
  END IF;

  -- Actualizar pago
  UPDATE payments SET
    status = 'paid',
    payment_method = _payment_method,
    amount = COALESCE(_amount, payment_record.amount),
    paid_at = now(),
    paid_by = auth.uid(),
    notes = _notes,
    updated_at = now()
  WHERE id = payment_record.id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Pago registrado exitosamente',
    'payment_id', payment_record.id
  );
END;
$$;

-- Función para procesar crédito por cancelación
CREATE OR REPLACE FUNCTION public.process_cancellation_credit(_appointment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record RECORD;
  appointment_record RECORD;
  hours_until_apt NUMERIC;
BEGIN
  -- Obtener pago
  SELECT * INTO payment_record
  FROM payments
  WHERE appointment_id = _appointment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado');
  END IF;

  -- Solo procesar si estaba pagado
  IF payment_record.status != 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La cita no estaba pagada');
  END IF;

  -- Obtener cita
  SELECT * INTO appointment_record
  FROM appointments
  WHERE id = _appointment_id;

  -- Calcular horas hasta la cita
  hours_until_apt := EXTRACT(EPOCH FROM (appointment_record.start_time - now())) / 3600;

  -- Si cumple política (+3h), generar crédito
  IF hours_until_apt >= 3 THEN
    UPDATE payments SET
      status = 'credit',
      notes = COALESCE(notes, '') || ' | Crédito generado por cancelación con ' || ROUND(hours_until_apt::numeric, 1) || 'h de anticipación',
      updated_at = now()
    WHERE id = payment_record.id;

    RETURN jsonb_build_object(
      'success', true,
      'credit_generated', true,
      'amount', payment_record.amount,
      'message', 'Crédito generado por cancelación dentro de política'
    );
  ELSE
    -- No cumple política, no hay reembolso
    UPDATE payments SET
      notes = COALESCE(notes, '') || ' | Cancelación fuera de política (' || ROUND(hours_until_apt::numeric, 1) || 'h). Sin reembolso.',
      updated_at = now()
    WHERE id = payment_record.id;

    RETURN jsonb_build_object(
      'success', true,
      'credit_generated', false,
      'message', 'Cancelación fuera de política. Sin reembolso.'
    );
  END IF;
END;
$$;