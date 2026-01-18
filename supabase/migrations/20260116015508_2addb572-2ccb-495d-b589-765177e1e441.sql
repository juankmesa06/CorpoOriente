-- Fix the audit insert policy to be more restrictive (only authenticated users or system)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.medical_record_audit;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.medical_record_audit FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR user_id = auth.uid());