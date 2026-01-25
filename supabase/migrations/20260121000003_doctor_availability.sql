-- Función para verificar si un médico está disponible en un rango de hora
CREATE OR REPLACE FUNCTION public.check_doctor_availability(
  _doctor_id UUID,
  _start_time TIMESTAMPTZ,
  _end_time TIMESTAMPTZ,
  _exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Verificar si hay citas solapadas
  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE doctor_id = _doctor_id
    AND status NOT IN ('cancelled', 'no_show')
    AND (_exclude_appointment_id IS NULL OR id != _exclude_appointment_id)
    AND (
      (start_time < _end_time AND end_time > _start_time) -- Overlap logic
    );
  
  RETURN conflict_count = 0;
END;
$$;

-- Función para obtener médicos disponibles en un horario específico
CREATE OR REPLACE FUNCTION public.get_available_doctors(
  _start_time TIMESTAMPTZ,
  _end_time TIMESTAMPTZ
)
RETURNS TABLE (
  doctor_id UUID,
  full_name TEXT,
  specialty TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id as doctor_id,
    p.full_name,
    dp.specialty
  FROM doctor_profiles dp
  JOIN profiles p ON dp.user_id = p.user_id
  WHERE dp.is_virtual_enabled = true OR EXISTS ( -- Asumimos que todos pueden atender presencial si no se especifica virtual
      SELECT 1 FROM rooms r WHERE r.is_active = true -- Simplificación: si hay consultorios activos
  )
  AND public.check_doctor_availability(dp.id, _start_time, _end_time) = true;
END;
$$;
