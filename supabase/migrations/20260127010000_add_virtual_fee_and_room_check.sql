-- 1. CLEAN SLATE: Remove old functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.check_any_available_room(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.check_any_available_room(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.check_room_availability(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.check_room_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS public.get_rooms_diagnostic();

-- 2. Function to check if ANY room is available (Compatible with ISO strings)
CREATE OR REPLACE FUNCTION public.check_any_available_room(
  p_start_time TEXT,
  p_end_time TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_rooms INTEGER;
  v_occupied_rooms INTEGER;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  -- Cast strings to timestamptz
  v_start := p_start_time::TIMESTAMPTZ;
  v_end := p_end_time::TIMESTAMPTZ;

  -- 1. How many rooms exist in total?
  SELECT COUNT(*) INTO v_total_rooms FROM public.rooms WHERE (is_active IS NOT FALSE);
  
  -- 2. If no rooms exist, return false 
  IF v_total_rooms = 0 THEN
    RETURN FALSE;
  END IF;

  -- 3. How many are occupied in this slot?
  SELECT COUNT(DISTINCT conflict_room_id)
  INTO v_occupied_rooms
  FROM (
    -- From rentals
    SELECT room_id as conflict_room_id FROM public.room_rentals
    WHERE status NOT IN ('cancelled', 'rejected')
    AND (start_time, end_time) OVERLAPS (v_start, v_end)
    UNION
    -- From appointments
    SELECT room_id as conflict_room_id FROM public.appointments
    WHERE room_id IS NOT NULL
    AND status NOT IN ('cancelled')
    AND (start_time, end_time) OVERLAPS (v_start, v_end)
  ) AS conflicts;

  -- 4. Result: True if there is at least one room that is not occupied
  RETURN v_total_rooms > v_occupied_rooms;
END;
$$;

-- 3. Diagnostic function (No params)
CREATE OR REPLACE FUNCTION public.get_rooms_diagnostic()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_rooms', (SELECT COUNT(*) FROM public.rooms),
    'active_rooms', (SELECT COUNT(*) FROM public.rooms WHERE is_active IS NOT FALSE),
    'check_time', now(),
    'message', 'Si ves esto, la funcion existe'
  );
END;
$$;

-- 4. Assign Room (Keep logic but ensure search_path and clean signature)
DROP FUNCTION IF EXISTS public.assign_room_to_appointment(UUID, UUID);
CREATE OR REPLACE FUNCTION public.assign_room_to_appointment(
  p_appointment_id UUID,
  p_doctor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt RECORD;
  v_room_id UUID;
  v_room_price DECIMAL(10, 2);
  v_rental_id UUID;
BEGIN
  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id;
  
  IF v_appt.is_virtual THEN
    RETURN jsonb_build_object('success', true, 'message', 'Virtual appointment, no room needed');
  END IF;

  -- Find the first free room
  SELECT r.id INTO v_room_id
  FROM public.rooms r
  WHERE (r.is_active IS NOT FALSE)
  AND NOT EXISTS (
    SELECT 1 FROM public.room_rentals rr
    WHERE rr.room_id = r.id
    AND rr.status NOT IN ('cancelled', 'rejected')
    AND (rr.start_time, rr.end_time) OVERLAPS (v_appt.start_time, v_appt.end_time)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.room_id = r.id
    AND a.status NOT IN ('cancelled')
    AND (a.start_time, a.end_time) OVERLAPS (v_appt.start_time, v_appt.end_time)
  )
  LIMIT 1;
  
  IF v_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No rooms available');
  END IF;

  SELECT price_per_hour INTO v_room_price FROM public.rooms WHERE id = v_room_id;

  INSERT INTO public.room_rentals (
    user_id, room_id, appointment_id, start_time, end_time, status, 
    total_price, hourly_rate, purpose, renter_name
  )
  VALUES (
    (SELECT user_id FROM public.doctor_profiles WHERE id = p_doctor_id LIMIT 1),
    v_room_id, p_appointment_id, v_appt.start_time, v_appt.end_time, 'active', 
    COALESCE(v_room_price, 0), COALESCE(v_room_price, 0), 'Consulta Médica', 'Doctor Assignment'
  )
  RETURNING id INTO v_rental_id;

  UPDATE public.appointments SET room_id = v_room_id WHERE id = p_appointment_id;

  RETURN jsonb_build_object('success', true, 'room_id', v_room_id, 'rental_id', v_rental_id);
END;
$$;

-- 5. GRANTS (Explicit permissions for everyone to avoid 403/404)
GRANT EXECUTE ON FUNCTION public.check_any_available_room(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_any_available_room(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_rooms_diagnostic() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rooms_diagnostic() TO anon;
GRANT EXECUTE ON FUNCTION public.assign_room_to_appointment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_room_to_appointment(UUID, UUID) TO anon;
