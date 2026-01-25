-- Fix RLS SELECT policies for medical_records and entries to allow doctors with appointments to view data

-- 1. Update medical_records policies for SELECT

DROP POLICY IF EXISTS "Doctors can view their patients records" ON public.medical_records;

CREATE POLICY "Doctors can view their patients records"
ON public.medical_records FOR SELECT
USING (EXISTS (
  SELECT 1 FROM doctor_profiles doc
  WHERE doc.user_id = auth.uid()
  AND (
      -- Check doctor_patients relationship
      EXISTS (
          SELECT 1 FROM doctor_patients dp
          WHERE dp.doctor_id = doc.id
          AND dp.patient_id = medical_records.patient_id
          AND dp.status = 'active'
      )
      OR
      -- Use the safe function for appointments
      public.check_doctor_has_appointment(medical_records.patient_id)
  )
));

-- 2. Update medical_record_entries policies for SELECT

DROP POLICY IF EXISTS "Doctors can view entries for their patients" ON public.medical_record_entries;

CREATE POLICY "Doctors can view entries for their patients"
ON public.medical_record_entries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM medical_records mr
  JOIN doctor_profiles doc ON doc.user_id = auth.uid()
  WHERE mr.id = medical_record_entries.medical_record_id
  AND (
      -- Check doctor_patients relationship
      EXISTS (
          SELECT 1 FROM doctor_patients dp
          WHERE dp.doctor_id = doc.id
          AND dp.patient_id = mr.patient_id
          AND dp.status = 'active'
      )
      OR
      -- Use the safe function for appointments
      public.check_doctor_has_appointment(mr.patient_id)
  )
));

-- 3. Update patient_profiles policies for SELECT (Just in case, though usually public or simpler)

DROP POLICY IF EXISTS "Doctors can view their patients" ON public.patient_profiles;

CREATE POLICY "Doctors can view their patients"
ON public.patient_profiles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM doctor_profiles doc
  WHERE doc.user_id = auth.uid()
  AND (
      -- Check doctor_patients relationship
      EXISTS (
          SELECT 1 FROM doctor_patients dp
          WHERE dp.doctor_id = doc.id
          AND dp.patient_id = patient_profiles.id
          AND dp.status = 'active'
      )
      OR
      -- Use the safe function for appointments
      public.check_doctor_has_appointment(patient_profiles.id)
  )
));
