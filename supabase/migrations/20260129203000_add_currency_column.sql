-- Add currency column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'currency') THEN
        ALTER TABLE public.payments ADD COLUMN currency TEXT DEFAULT 'COP';
    END IF;
END $$;
