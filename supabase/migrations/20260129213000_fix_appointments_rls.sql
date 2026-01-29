-- Enable RLS on appointments if not already enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own appointments (as patient)
CREATE POLICY "Patients can view their own appointments"
ON appointments FOR SELECT
TO authenticated
USING (auth.uid() = patient_id);

-- Allow users to create their own appointments (as patient)
-- Note: Often handled by Edge Function, but good to have for direct inserts if needed
CREATE POLICY "Patients can insert their own appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = patient_id);
