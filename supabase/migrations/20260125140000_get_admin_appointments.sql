-- Create a function to fetch appointments with all details for the admin dashboard
CREATE OR REPLACE FUNCTION get_admin_appointments()
RETURNS TABLE (
  id UUID,
  start_time TIMESTAMPTZ,
  status TEXT,
  is_virtual BOOLEAN,
  room_name TEXT,
  doctor_name TEXT,
  patient_name TEXT,
  payment_status TEXT,
  total_amount NUMERIC
)
SECURITY DEFINER -- Execute as creator (postgres) to bypass RLS for admin view
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.start_time,
    a.status,
    a.is_virtual,
    COALESCE(r.name, rr_room.name, '---') as room_name,
    COALESCE(dp_p.full_name, 'Desconocido') as doctor_name,
    COALESCE(pp_p.full_name, 'Desconocido') as patient_name,
    COALESCE(pay.status, 'pending') as payment_status,
    COALESCE(pay.amount, 0) as total_amount
  FROM appointments a
  -- Join Room (Direct)
  LEFT JOIN rooms r ON a.room_id = r.id
  -- Join Rental -> Room (Indirect)
  LEFT JOIN room_rentals rr ON a.rental_id = rr.id
  LEFT JOIN rooms rr_room ON rr.room_id = rr_room.id
  -- Join Doctor -> Profile
  LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.id
  LEFT JOIN profiles dp_p ON dp.user_id = dp_p.user_id
  -- Join Patient -> Profile
  LEFT JOIN patient_profiles pp ON a.patient_id = pp.id
  LEFT JOIN profiles pp_p ON pp.user_id = pp_p.user_id
  -- Join Payments
  LEFT JOIN payments pay ON a.id = pay.appointment_id
  ORDER BY a.start_time DESC
  LIMIT 50;
END;
$$;

-- Grant execute permission to authenticated users (so admins can call it)
GRANT EXECUTE ON FUNCTION get_admin_appointments() TO authenticated;
