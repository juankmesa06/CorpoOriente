-- Secure get_patient_medical_history to allow direct client usage with proper permission checks

CREATE OR REPLACE FUNCTION public.get_patient_medical_history(_patient_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  current_user_id UUID;
  is_admin BOOLEAN;
  is_doctor BOOLEAN;
  is_patient BOOLEAN;
  has_access BOOLEAN := FALSE;
BEGIN
  current_user_id := auth.uid();
  
  -- Check null auth
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Determine roles (primitive check using exists or helper)
  -- Assuming has_role function exists as per previous migrations
  is_admin := public.has_role(current_user_id, 'admin');
  
  -- Check Access
  IF is_admin THEN
    has_access := TRUE;
  ELSE
    -- Check if it's the patient themselves
    IF EXISTS (SELECT 1 FROM patient_profiles WHERE user_id = current_user_id AND id = _patient_id) THEN
        has_access := TRUE;
    ELSE
        -- Check if it is a doctor with access
        SELECT EXISTS (
             SELECT 1 FROM doctor_profiles doc 
             WHERE doc.user_id = current_user_id
             AND (
                 -- Direct Relationship
                 EXISTS (
                    SELECT 1 FROM doctor_patients dp 
                    WHERE dp.doctor_id = doc.id 
                    AND dp.patient_id = _patient_id 
                    AND dp.status = 'active'
                 )
                 OR
                 -- Valid Appointment (using the logic we established)
                 EXISTS (
                    SELECT 1 FROM appointments apt
                    WHERE apt.doctor_id = doc.id
                    AND apt.patient_id = _patient_id
                    AND apt.status IN ('confirmed', 'scheduled', 'completed')
                 )
             )
        ) INTO has_access;
    END IF;
  END IF;

  IF NOT has_access THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Original Logic (fetching the JSON)
  SELECT jsonb_build_object(
    'medical_record', (
      SELECT jsonb_build_object(
        'id', mr.id,
        'blood_type', mr.blood_type,
        'chronic_conditions', mr.chronic_conditions,
        'current_medications', mr.current_medications,
        'surgical_history', mr.surgical_history,
        'family_history', mr.family_history,
        'created_at', mr.created_at
      )
      FROM medical_records mr
      WHERE mr.patient_id = _patient_id
    ),
    'entries', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'version', e.version,
          'chief_complaint', e.chief_complaint,
          'diagnosis', e.diagnosis,
          'evolution', e.evolution,
          'treatment_plan', e.treatment_plan,
          'observations', e.observations,
          'vital_signs', e.vital_signs,
          'attachments', e.attachments,
          'created_at', e.created_at,
          'doctor', jsonb_build_object(
            'id', dp.id,
            'specialty', dp.specialty,
            'name', p.full_name
          ),
          'appointment_date', a.start_time
        ) ORDER BY e.created_at DESC
      ), '[]'::jsonb)
      FROM medical_record_entries e
      JOIN medical_records mr ON e.medical_record_id = mr.id
      JOIN doctor_profiles dp ON e.doctor_id = dp.id
      JOIN profiles p ON dp.user_id = p.user_id
      LEFT JOIN appointments a ON e.appointment_id = a.id
      WHERE mr.patient_id = _patient_id AND e.is_current = true
    ),
    'patient', (
      SELECT jsonb_build_object(
        'id', pp.id,
        'name', p.full_name,
        'date_of_birth', pp.date_of_birth,
        'gender', pp.gender,
        'allergies', pp.allergies
      )
      FROM patient_profiles pp
      JOIN profiles p ON pp.user_id = p.user_id
      WHERE pp.id = _patient_id
    )
  ) INTO result;

  RETURN result;
END;
$$;
