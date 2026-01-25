-- Fix RLS recursion by using a Security Definer function to check appointments

-- 1. Create a function to check appointment access safely (bypassing RLS on appointments table)
CREATE OR REPLACE FUNCTION public.check_doctor_has_appointment(_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doctor_id UUID;
BEGIN
  -- Get the doctor ID for the current user
  SELECT id INTO _doctor_id FROM doctor_profiles WHERE user_id = auth.uid();
  
  IF _doctor_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for valid appointment without triggering RLS on appointments table
  RETURN EXISTS (
    SELECT 1 FROM appointments
    WHERE doctor_id = _doctor_id
      AND patient_id = _patient_id
      AND status IN ('confirmed', 'scheduled', 'completed')
  );
END;
$$;

-- 2. Update medical_records policies to use the function

DROP POLICY IF EXISTS "Doctors can create records for their patients" ON public.medical_records;
DROP POLICY IF EXISTS "Doctors can update their patients records" ON public.medical_records;

CREATE POLICY "Doctors can create records for their patients"
ON public.medical_records FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM doctor_profiles doc
  WHERE doc.user_id = auth.uid()
  AND (
      -- Check doctor_patients relationship (Standard RLS is fine here if it doesn't recurse)
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

CREATE POLICY "Doctors can update their patients records"
ON public.medical_records FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM doctor_profiles doc
  WHERE doc.user_id = auth.uid()
  AND (
      EXISTS (
          SELECT 1 FROM doctor_patients dp
          WHERE dp.doctor_id = doc.id
          AND dp.patient_id = medical_records.patient_id
          AND dp.status = 'active'
      )
      OR
      public.check_doctor_has_appointment(medical_records.patient_id)
  )
));

-- 3. Update patient_profiles policies to use the function

DROP POLICY IF EXISTS "Doctors can update patient profiles" ON public.patient_profiles;

CREATE POLICY "Doctors can update patient profiles"
ON public.patient_profiles FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM doctor_profiles doc
  WHERE doc.user_id = auth.uid()
  AND (
      EXISTS (
          SELECT 1 FROM doctor_patients dp
          WHERE dp.doctor_id = doc.id
          AND dp.patient_id = patient_profiles.id
          AND dp.status = 'active'
      )
      OR
      public.check_doctor_has_appointment(patient_profiles.id)
  )
));
