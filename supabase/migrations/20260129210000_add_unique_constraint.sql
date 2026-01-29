-- Add unique constraint to appointment_id to allow upsert and ensure one payment per appointment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payments_appointment_id_key'
    ) THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_appointment_id_key UNIQUE (appointment_id);
    END IF;
END $$;
