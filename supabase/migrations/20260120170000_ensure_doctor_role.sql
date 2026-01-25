-- Migration: Ensure all users with a doctor_profile have the 'doctor' role
-- This fixes the 403 Forbidden error in Edge Functions where isDoctor check fails

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'doctor'::public.app_role
FROM public.doctor_profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure 'patient' role for patient profiles if missing
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'patient'::public.app_role
FROM public.patient_profiles
ON CONFLICT (user_id, role) DO NOTHING;
