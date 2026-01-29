-- Atomic Doctor + Room Availability Check
-- Prevents double-booking by checking both doctor and room availability atomically

-- 1. Create comprehensive availability check function
CREATE OR REPLACE FUNCTION public.check_doctor_and_room_availability(
  _doctor_id UUID,
  _room_id UUID,
  _start_time TIMESTAMPTZ,
  _end_time TIMESTAMPTZ,
  _exclude_appointment_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_available BOOLEAN,
  conflict_type TEXT,
  conflict_details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doctor_conflict_count INT;
  room_conflict_count INT;
  conflict_appointment UUID;
BEGIN
  -- Check doctor availability
  SELECT COUNT(*), MIN(id) INTO doctor_conflict_count, conflict_appointment
  FROM public.appointments
  WHERE doctor_id = _doctor_id
    AND status NOT IN ('cancelled', 'rejected')
    AND (id != _exclude_appointment_id OR _exclude_appointment_id IS NULL)
    AND (
      -- Check for time overlap using range intersection
      (_start_time, _end_time) OVERLAPS (start_time, end_time)
    );

  -- If doctor is busy, return early
  IF doctor_conflict_count > 0 THEN
    RETURN QUERY SELECT 
      FALSE AS is_available,
      'doctor_unavailable' AS conflict_type,
      'El médico ya tiene una cita programada en este horario' AS conflict_details;
    RETURN;
  END IF;

  -- Check room availability (only if room_id is provided)
  IF _room_id IS NOT NULL THEN
    SELECT COUNT(*), MIN(id) INTO room_conflict_count, conflict_appointment
    FROM public.appointments
    WHERE room_id = _room_id
      AND status NOT IN ('cancelled', 'rejected')
      AND (id != _exclude_appointment_id OR _exclude_appointment_id IS NULL)
      AND (
        (_start_time, _end_time) OVERLAPS (start_time, end_time)
      );

    IF room_conflict_count > 0 THEN
      RETURN QUERY SELECT 
        FALSE AS is_available,
        'room_unavailable' AS conflict_type,
        'El consultorio ya está reservado en este horario' AS conflict_details;
      RETURN;
    END IF;
  END IF;

  -- Both doctor and room are available
  RETURN QUERY SELECT 
    TRUE AS is_available,
    NULL::TEXT AS conflict_type,
    NULL::TEXT AS conflict_details;
END;
$$;

-- 2. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_doctor_and_room_availability TO authenticated;

-- 3. Add helpful comment
COMMENT ON FUNCTION public.check_doctor_and_room_availability IS 
  'Atomically checks if both doctor and room are available for the given time slot. Returns conflict details if unavailable.';

-- 4. Create a simpler wrapper for backward compatibility
CREATE OR REPLACE FUNCTION public.check_combined_availability(
  _doctor_id UUID,
  _room_id UUID,
  _start_time TIMESTAMPTZ,
  _end_time TIMESTAMPTZ,
  _exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  availability_result RECORD;
BEGIN
  SELECT * INTO availability_result
  FROM public.check_doctor_and_room_availability(
    _doctor_id, _room_id, _start_time, _end_time, _exclude_appointment_id
  );
  
  RETURN availability_result.is_available;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_combined_availability TO authenticated;
