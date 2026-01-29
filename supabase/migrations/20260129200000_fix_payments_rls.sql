-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 1. VIEW POLICIES
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (
  appointment_id IN (
    SELECT id FROM public.appointments 
    WHERE patient_id = auth.uid() 
       OR doctor_id IN (SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid())
  )
);

-- 2. INSERT POLICIES (Patients need to create payments or trigger creates them)
DROP POLICY IF EXISTS "Users can insert payments for their appointments" ON public.payments;
CREATE POLICY "Users can insert payments for their appointments"
ON public.payments
FOR INSERT
WITH CHECK (
  appointment_id IN (
    SELECT id FROM public.appointments WHERE patient_id = auth.uid()
  )
);

-- 3. UPDATE POLICIES (Patients paying)
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update their own payments"
ON public.payments
FOR UPDATE
USING (
  appointment_id IN (
    SELECT id FROM public.appointments WHERE patient_id = auth.uid()
  )
);
