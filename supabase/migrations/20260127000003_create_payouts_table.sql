-- Create Payouts Table for Weekly Financial Distribution
-- Tracks doctor payouts, clinic revenue, and platform commission

-- 1. Create payout_status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE public.payout_status AS ENUM ('pending', 'processed', 'failed', 'cancelled');
  END IF;
END $$;

-- 2. Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  
  -- Financial breakdown
  consultation_fee DECIMAL(10, 2) NOT NULL, -- Total appointment payment
  room_rental_cost DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Cost of room rental
  doctor_payout DECIMAL(10, 2) NOT NULL, -- Amount for doctor (consultation_fee - room_rental_cost)
  clinic_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Amount for clinic (room_rental_cost)
  platform_commission DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Amount for platform
  platform_commission_rate DECIMAL(5, 4) DEFAULT 0.05, -- 5% default commission rate
  
  -- Processing info
  status public.payout_status DEFAULT 'pending' NOT NULL,
  processing_date TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  week_start_date DATE NOT NULL, -- Start of the week this payout belongs to
  
  -- External payment gateway
  payment_reference TEXT, -- External payment gateway transaction ID
  payment_gateway TEXT, -- e.g., 'stripe', 'paypal', 'bank_transfer'
  
  -- Audit
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: ensure payout is calculated correctly
  CONSTRAINT valid_payout_calculation CHECK (
    doctor_payout = consultation_fee - room_rental_cost - platform_commission
  )
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payouts_appointment ON public.payouts(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payouts_doctor ON public.payouts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_week_start ON public.payouts(week_start_date);
CREATE INDEX IF NOT EXISTS idx_payouts_processing_date ON public.payouts(processing_date);

-- 4. Add trigger for updated_at
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Only admins and super_admins can view/manage payouts
CREATE POLICY "Admins can view all payouts"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert payouts"
  ON public.payouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update payouts"
  ON public.payouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 7. Doctors can view their own payouts
CREATE POLICY "Doctors can view their own payouts"
  ON public.payouts FOR SELECT
  USING (
    doctor_id IN (
      SELECT id FROM public.doctor_profiles
      WHERE user_id = auth.uid()
    )
  );

-- 8. Add helpful comments
COMMENT ON TABLE public.payouts IS 'Tracks weekly financial distribution: doctor payouts, clinic revenue, and platform commission';
COMMENT ON COLUMN public.payouts.doctor_payout IS 'Amount paid to doctor = consultation_fee - room_rental_cost - platform_commission';
COMMENT ON COLUMN public.payouts.clinic_revenue IS 'Amount retained by clinic = room_rental_cost';
COMMENT ON COLUMN public.payouts.platform_commission IS 'Amount for platform = consultation_fee × platform_commission_rate';
