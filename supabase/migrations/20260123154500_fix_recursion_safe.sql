-- Fix 500 Error (Infinite Recursion)
-- We use a SECURITY DEFINER function to check appointments without triggering RLS on the appointments table again.

CREATE OR REPLACE FUNCTION public.doctor_can_view_patient(_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user (doctor) has an appointment with this patient
  RETURN EXISTS (
    SELECT 1 
    FROM public.appointments a
    JOIN public.doctor_profiles doc ON a.doctor_id = doc.id
    WHERE a.patient_id = _patient_id
    AND doc.user_id = auth.uid()
  );
END;
$$;

-- Drop the previous recursive policy
DROP POLICY IF EXISTS "Doctors can view patient_profiles of their appointments" ON public.patient_profiles;

-- Create the new safe policy
CREATE POLICY "Doctors can view patient_profiles of their appointments"
ON public.patient_profiles FOR SELECT
TO authenticated
USING (
  public.doctor_can_view_patient(id)
);
