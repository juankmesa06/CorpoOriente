-- Fix RLS: Allow Doctors to view patient_profiles if they have an appointment with them
-- Even if they are not formally "assigned" in doctor_patients table.

CREATE POLICY "Doctors can view patient_profiles of their appointments"
ON public.patient_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.doctor_profiles doc ON a.doctor_id = doc.id
    WHERE a.patient_id = patient_profiles.id
    AND doc.user_id = auth.uid()
  )
);
