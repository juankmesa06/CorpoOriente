-- Add university column to doctor_profiles
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS university TEXT;

COMMENT ON COLUMN public.doctor_profiles.university IS 'University or institution where the doctor graduated from.';
