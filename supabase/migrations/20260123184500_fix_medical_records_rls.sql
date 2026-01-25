-- Fix RLS for medical_records and patient_profiles to allow doctors with appointments to modify data

-- 1. Update medical_records policies

DROP POLICY IF EXISTS "Doctors can create records for their patients" ON public.medical_records;
DROP POLICY IF EXISTS "Doctors can update their patients records" ON public.medical_records;

CREATE POLICY "Doctors can create records for their patients"
ON public.medical_records FOR INSERT
WITH CHECK (EXISTS (
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
      -- Check for valid appointments
      EXISTS (
          SELECT 1 FROM appointments apt
          WHERE apt.doctor_id = doc.id
          AND apt.patient_id = medical_records.patient_id
          AND apt.status IN ('confirmed', 'scheduled', 'completed')
      )
  )
));

CREATE POLICY "Doctors can update their patients records"
ON public.medical_records FOR UPDATE
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
      -- Check for valid appointments
      EXISTS (
          SELECT 1 FROM appointments apt
          WHERE apt.doctor_id = doc.id
          AND apt.patient_id = medical_records.patient_id
          AND apt.status IN ('confirmed', 'scheduled', 'completed')
      )
  )
));

-- 2. Update patient_profiles policies for UPDATE (Vital Signs)

DROP POLICY IF EXISTS "Doctors can update patient profiles" ON public.patient_profiles;

CREATE POLICY "Doctors can update patient profiles"
ON public.patient_profiles FOR UPDATE
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
      -- Check for valid appointments
      EXISTS (
          SELECT 1 FROM appointments apt
          WHERE apt.doctor_id = doc.id
          AND apt.patient_id = patient_profiles.id
          AND apt.status IN ('confirmed', 'scheduled', 'completed')
      )
  )
));

-- Ensure medical_records has insert policy for system/admin if needed, but the Doctor one handles the UI case.
