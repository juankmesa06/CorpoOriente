-- COMPREHENSIVE FIX for Doctor Visibility Steps
-- 1. Create Safe Check Function (Prevents Recursion)
CREATE OR REPLACE FUNCTION public.doctor_can_view_patient_id(_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.appointments a
    JOIN public.doctor_profiles doc ON a.doctor_id = doc.id
    WHERE a.patient_id = _patient_id
    AND doc.user_id = auth.uid()
  );
END;
$$;

-- 2. Create Check Function for User ID (for Profiles table)
CREATE OR REPLACE FUNCTION public.doctor_can_view_user_id(_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.appointments a
    JOIN public.patient_profiles pp ON a.patient_id = pp.id
    JOIN public.doctor_profiles doc ON a.doctor_id = doc.id
    WHERE pp.user_id = _target_user_id
    AND doc.user_id = auth.uid()
  );
END;
$$;

-- 3. Update patient_profiles Policy
DROP POLICY IF EXISTS "Doctors can view patient_profiles of their appointments" ON public.patient_profiles;
CREATE POLICY "Doctors can view patient_profiles of their appointments"
ON public.patient_profiles FOR SELECT
TO authenticated
USING (
  public.doctor_can_view_patient_id(id)
);

-- 4. Update profiles Policy
DROP POLICY IF EXISTS "Doctors can view profiles of their patients" ON public.profiles;
-- We keep the original 'assigned' logic via the old policy or add a new one. 
-- The old one was: "Doctors can view profiles of their patients" (exists in doctor_patients)
-- We will Add a NEW policy for 'appointment' based visibility
CREATE POLICY "Doctors can view profiles of appointment patients"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.doctor_can_view_user_id(user_id)
);
