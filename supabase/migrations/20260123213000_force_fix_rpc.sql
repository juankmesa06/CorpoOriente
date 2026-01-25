-- Drop the function first to allow changing the return table definition
DROP FUNCTION IF EXISTS public.get_doctor_patients_list();

-- Re-create the function with unambiguous column names
CREATE OR REPLACE FUNCTION public.get_doctor_patients_list()
RETURNS TABLE (
  pt_id UUID,
  pt_name TEXT,
  pt_email TEXT,
  pt_avatar_url TEXT,
  pt_dob DATE,
  pt_gender TEXT,
  pt_status TEXT,
  pt_source TEXT,
  last_appt TIMESTAMP WITH TIME ZONE,
  next_appt TIMESTAMP WITH TIME ZONE
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
          a.patient_id,
          MAX(CASE WHEN a.start_time < now() THEN a.start_time END) as last_val,
          MIN(CASE WHEN a.start_time >= now() THEN a.start_time END) as next_val
      FROM appointments a
      WHERE a.doctor_id = _doctor_id
      GROUP BY a.patient_id
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
      aa.last_val,
      aa.next_val
  FROM patient_details pd
  LEFT JOIN appointments_agg aa ON aa.patient_id = pd.patient_id;
END;
$$;
