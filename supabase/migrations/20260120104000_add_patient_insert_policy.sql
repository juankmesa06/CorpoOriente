-- Policy: Allow patients to insert their own profile data
-- This is required because the row is not created on signup, only on first edit.
DROP POLICY IF EXISTS "Patients can insert own profile" ON public.patient_profiles;
CREATE POLICY "Patients can insert own profile"
ON public.patient_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
