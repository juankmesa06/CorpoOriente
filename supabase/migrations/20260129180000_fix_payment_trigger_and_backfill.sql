-- 1. Fix the trigger function to use the doctor's fee
CREATE OR REPLACE FUNCTION public.create_payment_for_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doctor_fee DECIMAL(10, 2);
  _is_virtual BOOLEAN;
BEGIN
  -- Get the consultation fee from doctor profile
  SELECT 
    CASE WHEN NEW.is_virtual THEN COALESCE(consultation_fee_virtual, consultation_fee, 0)
         ELSE COALESCE(consultation_fee, 0)
    END INTO _doctor_fee
  FROM doctor_profiles
  WHERE id = NEW.doctor_id;

  -- Default to 0 if not found (don't hardcode 500)
  _doctor_fee := COALESCE(_doctor_fee, 0);

  -- Insert the payment record with the correct amount
  INSERT INTO payments (appointment_id, amount, currency, status)
  VALUES (NEW.id, _doctor_fee, 'COP', 'pending')
  ON CONFLICT (appointment_id) DO UPDATE 
  SET amount = EXCLUDED.amount,
      currency = EXCLUDED.currency;

  RETURN NEW;
END;
$$;

-- 2. Backfill existing records that have the hardcoded 500.00
-- This only updates payments where the amount is exactly 500 and were likely created by the old trigger
DO $$
DECLARE
    r RECORD;
    _correct_fee DECIMAL(10, 2);
BEGIN
    FOR r IN 
        SELECT p.id, p.appointment_id, a.doctor_id, a.is_virtual
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        WHERE p.amount = 500.00
    LOOP
        SELECT 
            CASE WHEN r.is_virtual THEN COALESCE(consultation_fee_virtual, consultation_fee, 0)
                 ELSE COALESCE(consultation_fee, 0)
            END INTO _correct_fee
        FROM doctor_profiles
        WHERE id = r.doctor_id;

        IF _correct_fee IS NOT NULL AND _correct_fee != 500.00 THEN
            UPDATE payments 
            SET amount = _correct_fee,
                currency = 'COP'
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
