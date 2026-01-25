-- Add is_affiliated column to doctor_profiles table
-- This allows admins to control which doctors are affiliated with the organization

ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS is_affiliated BOOLEAN DEFAULT true NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.doctor_profiles.is_affiliated IS 'Indicates whether the doctor is currently affiliated with the organization. Affiliated doctors appear in patient booking lists.';

-- Update existing records to be affiliated by default
UPDATE public.doctor_profiles 
SET is_affiliated = true 
WHERE is_affiliated IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_is_affiliated 
ON public.doctor_profiles(is_affiliated);
