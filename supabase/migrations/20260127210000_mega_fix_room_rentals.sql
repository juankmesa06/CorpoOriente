-- migration 20260127210000_mega_fix_room_rentals.sql

-- 1. ENSURE ROOM_RENTALS SCHEMA
-- We need to make sure the table has all required columns for the assignment logic
DO $$
BEGIN
    -- room_id (Link to actual room)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'room_id') THEN
        ALTER TABLE public.room_rentals ADD COLUMN room_id UUID REFERENCES public.rooms(id);
    END IF;

    -- user_id (Who is responsible/doctor)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'user_id') THEN
        ALTER TABLE public.room_rentals ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    -- appointment_id (So we can track back)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'appointment_id') THEN
        ALTER TABLE public.room_rentals ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. CREATE ROBUST ASSIGNMENT FUNCTION
-- This replaces the previous versions with error handling and better logging
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
  v_doctor_user_id UUID;
BEGIN
  -- A. Get appointment data
  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id;
  
  IF v_appt IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cita ' || p_appointment_id || ' no encontrada');
  END IF;

  IF v_appt.is_virtual THEN
    RETURN jsonb_build_object('success', true, 'message', 'Cita virtual, no requiere consultorio');
  END IF;

  -- B. Find available room
  -- Check rooms that are active and NOT occupied in overlapping period
  -- Occupied means: either has a direct appointment OR a manual rental in room_rentals
  SELECT r.id, COALESCE(r.price_per_hour, 0) 
  INTO v_room_id, v_room_price
  FROM public.rooms r
  WHERE r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.room_id = r.id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND (a.start_time, a.end_time) OVERLAPS (v_appt.start_time, v_appt.end_time)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.room_rentals rr
    WHERE rr.room_id = r.id
    AND rr.status NOT IN ('cancelled', 'rejected')
    AND (rr.start_time, rr.end_time) OVERLAPS (v_appt.start_time, v_appt.end_time)
  )
  LIMIT 1;
  
  IF v_room_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No hay consultorios disponibles para el horario: ' || v_appt.start_time);
  END IF;

  -- C. Get doctor user_id
  SELECT user_id INTO v_doctor_user_id FROM public.doctor_profiles WHERE id = p_doctor_id;

  -- D. Create rental record for the doctor (for billing/history)
  INSERT INTO public.room_rentals (
    user_id, 
    room_id, 
    appointment_id, 
    start_time, 
    end_time, 
    status, 
    total_price, 
    hourly_rate, 
    purpose, 
    renter_name
  )
  VALUES (
    v_doctor_user_id,
    v_room_id, 
    p_appointment_id, 
    v_appt.start_time, 
    v_appt.end_time, 
    'active', 
    v_room_price, 
    v_room_price, 
    'Consulta Médica', 
    'Asignación Automática'
  )
  RETURNING id INTO v_rental_id;

  -- E. Final Update: Link appointment to room and rental
  UPDATE public.appointments 
  SET 
    room_id = v_room_id,
    rental_id = v_rental_id,
    location_confirmed = true
  WHERE id = p_appointment_id;

  RETURN jsonb_build_object(
    'success', true, 
    'room_id', v_room_id, 
    'rental_id', v_rental_id,
    'message', 'Consultorio asignado exitosamente'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 
    'message', 'Error interno: ' || SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- 3. GRANTS
GRANT EXECUTE ON FUNCTION public.assign_room_to_appointment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_room_to_appointment(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.assign_room_to_appointment(UUID, UUID) TO service_role;
