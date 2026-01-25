-- Fix Room Rentals Table Schema (Updated)
-- We add ALL potentially missing columns, including appointment_id.

DO $$
BEGIN
    -- user_id (Who rented the room - usually a doctor)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'user_id') THEN
        ALTER TABLE public.room_rentals ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    -- appointment_id (Optional link to an appointment)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'appointment_id') THEN
        ALTER TABLE public.room_rentals ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;
    END IF;

    -- Renter details (snapshot for invoice/contact)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'renter_name') THEN
        ALTER TABLE public.room_rentals ADD COLUMN renter_name TEXT;
        ALTER TABLE public.room_rentals ADD COLUMN renter_email TEXT;
        ALTER TABLE public.room_rentals ADD COLUMN renter_phone TEXT;
    END IF;

    -- Rental details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'purpose') THEN
        ALTER TABLE public.room_rentals ADD COLUMN purpose TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'hourly_rate') THEN
        ALTER TABLE public.room_rentals ADD COLUMN hourly_rate DECIMAL(10, 2) DEFAULT 0;
        ALTER TABLE public.room_rentals ADD COLUMN total_price DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'status') THEN
        ALTER TABLE public.room_rentals ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    -- Ensure timestamps exist (safeguard)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'start_time') THEN
        ALTER TABLE public.room_rentals ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_rentals' AND column_name = 'end_time') THEN
        ALTER TABLE public.room_rentals ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
    END IF;
    
END $$;

-- Enable RLS just in case
ALTER TABLE public.room_rentals ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can insert their own rentals
DROP POLICY IF EXISTS "Doctors can create rentals" ON public.room_rentals;
CREATE POLICY "Doctors can create rentals"
ON public.room_rentals FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Doctors can view their own rentals
DROP POLICY IF EXISTS "Doctors can view own rentals" ON public.room_rentals;
CREATE POLICY "Doctors can view own rentals"
ON public.room_rentals FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_room_rentals_appointment_id ON public.room_rentals(appointment_id);
