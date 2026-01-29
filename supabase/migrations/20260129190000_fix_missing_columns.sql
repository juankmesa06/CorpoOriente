-- 1. Ensure the consultation_fee_virtual column exists
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS consultation_fee_virtual NUMERIC;

-- 2. Update the trigger function with more robustness and correct column names
CREATE OR REPLACE FUNCTION public.create_payment_for_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doctor_fee DECIMAL(10, 2);
BEGIN
  -- Re-fetch with a fresh select to avoid any stale data issues in the trigger context
  SELECT 
    CASE WHEN NEW.is_virtual THEN COALESCE(consultation_fee_virtual, consultation_fee, 0)
         ELSE COALESCE(consultation_fee, 0)
    END INTO _doctor_fee
  FROM public.doctor_profiles
  WHERE id = NEW.doctor_id;

  -- Default to 0 if not found
  _doctor_fee := COALESCE(_doctor_fee, 0);

  -- Insert the payment record. Use ON CONFLICT just in case of retries
  INSERT INTO public.payments (appointment_id, amount, currency, status)
  VALUES (NEW.id, _doctor_fee, 'COP', 'pending')
  ON CONFLICT (appointment_id) DO UPDATE 
  SET amount = EXCLUDED.amount,
      currency = EXCLUDED.currency;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the appointment creation if payment creation fails
  -- This is a safety measure, though ideally it should always work
  RAISE WARNING 'Error creating payment for appointment %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
