DO $$
DECLARE
  v_doctor_id uuid;
  v_patient_id uuid;
  v_user_id uuid;
  v_count integer := 0;
BEGIN
  -- 1. Get Doctor ID explicitly by user email
  SELECT dp.id INTO v_doctor_id
  FROM doctor_profiles dp
  JOIN profiles p ON p.user_id = dp.user_id
  WHERE p.email = 'juanmesa8807@gmail.com'
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Doctor with email juanmesa8807@gmail.com not found.';
  END IF;

  RAISE NOTICE 'Found Doctor ID: %', v_doctor_id;

  -- 2. Loop through all existing patient profiles
  FOR v_patient_id, v_user_id IN 
      SELECT id, user_id FROM patient_profiles 
  LOOP
    v_count := v_count + 1;
    
    -- A. Create Relationship in doctor_patients (Required for 'Mis Pacientes')
    INSERT INTO doctor_patients (doctor_id, patient_id, status)
    VALUES (v_doctor_id, v_patient_id, 'active')
    ON CONFLICT (doctor_id, patient_id) DO NOTHING;

    -- B. Create Test Appointments (if not exists for this time/doctor)

    -- Appointment 1: TODAY (1 hour from now)
    INSERT INTO appointments (doctor_id, patient_id, start_time, end_time, status, is_virtual, created_by)
    SELECT 
        v_doctor_id, 
        v_patient_id, 
        (now() + interval '1 hour'), 
        (now() + interval '2 hours'), 
        'scheduled', 
        true,
        v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM appointments 
        WHERE doctor_id = v_doctor_id 
        AND patient_id = v_patient_id 
        AND start_time > now()
        AND start_time < (now() + interval '5 hours')
    );

    -- Appointment 2: TOMORROW (24 hours from now)
    INSERT INTO appointments (doctor_id, patient_id, start_time, end_time, status, is_virtual, created_by)
    SELECT 
        v_doctor_id, 
        v_patient_id, 
        (now() + interval '1 day' + interval '10 hours'), 
        (now() + interval '1 day' + interval '11 hours'), 
        'scheduled', 
        false,
        v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM appointments 
        WHERE doctor_id = v_doctor_id 
        AND patient_id = v_patient_id 
        AND start_time > (now() + interval '1 day')
    );

  END LOOP;

  RAISE NOTICE 'Processed % patients. Created relationships and appointments.', v_count;

END $$;
