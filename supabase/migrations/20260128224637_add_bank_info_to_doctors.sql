-- Add bank information fields to doctor_profiles
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT;

-- Update the comments for documentation
COMMENT ON COLUMN public.doctor_profiles.bank_name IS 'Nombre del banco para pagos de honorarios';
COMMENT ON COLUMN public.doctor_profiles.account_number IS 'Número de cuenta bancaria';
COMMENT ON COLUMN public.doctor_profiles.account_type IS 'Tipo de cuenta (Ahorros/Corriente)';