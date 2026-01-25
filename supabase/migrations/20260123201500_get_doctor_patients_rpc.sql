-- Function to fetch doctor's patients (active relation OR appointments) with profile details
CREATE OR REPLACE FUNCTION public.get_doctor_patients_list()
RETURNS TABLE (
  patient_id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,
  status TEXT,
  source TEXT,
  last_appointment TIMESTAMP WITH TIME ZONE,
  next_appointment TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doctor_id UUID;
BEGIN
  -- Get doctor profile id
  SELECT id INTO _doctor_id FROM doctor_profiles WHERE user_id = auth.uid();
  
  IF _doctor_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH unique_patients AS (
      -- 1. From Doctor-Patient Relationships
      SELECT 
          dp.patient_id,
          'active'::text as status,
          'relationship'::text as source
      FROM doctor_patients dp
      WHERE dp.doctor_id = _doctor_id
      
      UNION
      
      -- 2. From Appointments (Completed, Scheduled, etc)
      SELECT 
          a.patient_id,
          CASE WHEN a.status = 'cancelled' THEN 'inactive' ELSE 'active' END as status,
          'appointment'::text as source
      FROM appointments a
      WHERE a.doctor_id = _doctor_id
      AND a.status IN ('confirmed', 'scheduled', 'completed')
  ),
  patient_details AS (
      SELECT DISTINCT ON (up.patient_id)
          up.patient_id,
          up.status,
          up.source,
          p.full_name,
          p.email,
          p.avatar_url,
          pp.date_of_birth,
          pp.gender
      FROM unique_patients up
      JOIN patient_profiles pp ON pp.id = up.patient_id
      JOIN profiles p ON p.user_id = pp.user_id
  ),
  appointments_agg AS (
      SELECT 
          patient_id,
          MAX(CASE WHEN start_time < now() THEN start_time END) as last_appt,
          MIN(CASE WHEN start_time >= now() THEN start_time END) as next_appt
      FROM appointments
      WHERE doctor_id = _doctor_id
      GROUP BY patient_id
  )
  SELECT 
      pd.patient_id,
      pd.full_name,
      pd.email,
      pd.avatar_url,
      pd.date_of_birth,
      pd.gender,
      pd.status,
      pd.source,
      aa.last_appt,
      aa.next_appt
  FROM patient_details pd
  LEFT JOIN appointments_agg aa ON aa.patient_id = pd.patient_id;
END;
$$;
