-- Fix RLS: Allow Doctors to view Payments for their appointments
CREATE POLICY "Doctors can view payments for their appointments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.doctor_profiles dp ON a.doctor_id = dp.id
      WHERE a.id = payments.appointment_id
      AND dp.user_id = auth.uid()
    )
  );

-- Fix RLS: Allow Doctors to view Profiles of their patients (to see names)
CREATE POLICY "Doctors can view profiles of their patients"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patients dp
      JOIN public.patient_profiles pp ON dp.patient_id = pp.id
      JOIN public.doctor_profiles doc ON dp.doctor_id = doc.id
      WHERE pp.user_id = profiles.user_id
      AND doc.user_id = auth.uid()
      AND dp.status = 'active'
    )
  );
