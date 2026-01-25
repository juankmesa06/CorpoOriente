-- Fix create_medical_entry to allow doctors with appointments to create entries

CREATE OR REPLACE FUNCTION public.create_medical_entry(
  _patient_id UUID,
  _doctor_id UUID,
  _appointment_id UUID,
  _chief_complaint TEXT,
  _diagnosis TEXT DEFAULT NULL,
  _evolution TEXT DEFAULT NULL,
  _treatment_plan TEXT DEFAULT NULL,
  _observations TEXT DEFAULT NULL,
  _vital_signs JSONB DEFAULT NULL,
  _attachments TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_id UUID;
  entry_id UUID;
  doctor_user_id UUID;
  has_relationship BOOLEAN;
  has_appointment BOOLEAN;
BEGIN
  -- Get doctor's user_id for audit
  SELECT user_id INTO doctor_user_id FROM doctor_profiles WHERE id = _doctor_id;
  
  -- Check doctor-patient relationship
  SELECT EXISTS (
    SELECT 1 FROM doctor_patients 
    WHERE doctor_id = _doctor_id AND patient_id = _patient_id AND status = 'active'
  ) INTO has_relationship;

  -- Check for valid appointments (if no direct relationship)
  IF NOT has_relationship THEN
      SELECT EXISTS (
        SELECT 1 FROM appointments
        WHERE doctor_id = _doctor_id 
          AND patient_id = _patient_id 
          AND status IN ('confirmed', 'scheduled', 'completed')
      ) INTO has_appointment;
  END IF;

  -- Verify permissions
  IF NOT has_relationship AND NOT has_appointment THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tiene relación activa con este paciente');
  END IF;

  -- Get or create medical record
  record_id := get_or_create_medical_record(_patient_id, doctor_user_id);

  -- Create entry
  INSERT INTO medical_record_entries (
    medical_record_id,
    appointment_id,
    doctor_id,
    chief_complaint,
    diagnosis,
    evolution,
    treatment_plan,
    observations,
    vital_signs,
    attachments
  ) VALUES (
    record_id,
    _appointment_id,
    _doctor_id,
    _chief_complaint,
    _diagnosis,
    _evolution,
    _treatment_plan,
    _observations,
    _vital_signs,
    _attachments
  )
  RETURNING id INTO entry_id;

  -- Audit log
  INSERT INTO medical_record_audit (medical_record_id, entry_id, user_id, action, action_details)
  VALUES (record_id, entry_id, doctor_user_id, 'create', jsonb_build_object(
    'appointment_id', _appointment_id,
    'chief_complaint', _chief_complaint
  ));

  RETURN jsonb_build_object(
    'success', true,
    'entry_id', entry_id,
    'medical_record_id', record_id
  );
END;
$$;
