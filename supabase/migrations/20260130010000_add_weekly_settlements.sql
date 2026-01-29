-- Create table for weekly settlements (Aríme vs CorpoOriente split)
CREATE TABLE IF NOT EXISTS public.weekly_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date DATE NOT NULL UNIQUE,
    total_rental_income DECIMAL DEFAULT 0,
    arime_commission_rate DECIMAL DEFAULT 0,
    arime_amount DECIMAL DEFAULT 0,
    corpo_oriente_amount DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, processed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.weekly_settlements ENABLE ROW LEVEL SECURITY;

-- 1. Admin Policy: Full Management
DROP POLICY IF EXISTS "Admins can manage weekly settlements" ON public.weekly_settlements;
CREATE POLICY "Admins can manage weekly settlements"
    ON public.weekly_settlements
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Super Admin Policy: View Only
DROP POLICY IF EXISTS "Super Admins can view weekly settlements" ON public.weekly_settlements;
CREATE POLICY "Super Admins can view weekly settlements"
    ON public.weekly_settlements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Update the payout calculation function
DROP FUNCTION IF EXISTS public.calculate_weekly_payouts(DATE, DECIMAL);

CREATE OR REPLACE FUNCTION public.calculate_weekly_payouts(
  _week_start_date DATE,
  _arime_commission_percent DECIMAL DEFAULT 10.0 -- e.g., 10 for 10%
)
RETURNS TABLE (
  total_appointments INT,
  total_consultation_fees DECIMAL,
  total_room_rentals DECIMAL,
  total_doctor_payouts DECIMAL,
  total_platform_commission DECIMAL,
  payouts_created INT,
  arime_payment_created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _week_end_date DATE;
  _appointment RECORD;
  _room_cost DECIMAL;
  _duration_hours DECIMAL;
  _consultation_fee DECIMAL;
  _platform_commission DECIMAL;
  _doctor_payout DECIMAL;
  _payouts_created INT := 0;
  
  -- Aggregates for Weekly Settlement
  _total_appt_rental_income DECIMAL := 0;
  _direct_rental_income DECIMAL := 0;
  _total_rental_income DECIMAL := 0;
  _arime_amount DECIMAL := 0;
  _corpo_amount DECIMAL := 0;
BEGIN
  -- Strict Check: Only 'admin' role can execute this (Super Admin view only)
  IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
      RAISE EXCEPTION 'Access denied. Only Administrators can generate payouts.';
  END IF;

  -- Calculate week end date (week_start + 7 days)
  _week_end_date := _week_start_date + INTERVAL '7 days';

  -- 1. PROCESS APPOINTMENTS (Create Payouts)
  FOR _appointment IN
    SELECT 
      a.id AS appointment_id,
      a.doctor_id,
      a.room_id,
      a.start_time,
      a.end_time,
      a.is_virtual,
      dp.consultation_fee AS doctor_fee,
      r.price_per_hour AS room_hourly_rate,
      p.amount AS payment_amount
    FROM public.appointments a
    INNER JOIN public.doctor_profiles dp ON a.doctor_id = dp.id
    LEFT JOIN public.rooms r ON a.room_id = r.id
    INNER JOIN public.payments p ON a.id = p.appointment_id
    WHERE a.status = 'completed'
      AND p.status = 'paid'
      AND a.start_time >= _week_start_date
      AND a.start_time < _week_end_date
      AND NOT EXISTS (
        SELECT 1 FROM public.payouts
        WHERE appointment_id = a.id
      )
  LOOP
    -- Calculate duration
    _duration_hours := EXTRACT(EPOCH FROM (_appointment.end_time - _appointment.start_time)) / 3600.0;
    
    -- Calculate room rental cost
    IF _appointment.is_virtual THEN
       _room_cost := 10000;
    ELSIF _appointment.room_id IS NOT NULL AND _appointment.room_hourly_rate IS NOT NULL THEN
       _room_cost := _appointment.room_hourly_rate * _duration_hours;
    ELSE
       _room_cost := 0;
    END IF;

    -- Calculate fees
    _consultation_fee := COALESCE(_appointment.payment_amount, _appointment.doctor_fee, 0);
    _platform_commission := _consultation_fee * 0.05; -- Keeping fixed 5% platform fee logic from previous version
    _doctor_payout := GREATEST(0, _consultation_fee - _room_cost - _platform_commission);

    -- Insert payout
    INSERT INTO public.payouts (
      appointment_id,
      doctor_id,
      consultation_fee,
      room_rental_cost,
      doctor_payout,
      clinic_revenue,
      platform_commission,
      platform_commission_rate,
      status,
      week_start_date,
      processing_date
    ) VALUES (
      _appointment.appointment_id,
      _appointment.doctor_id,
      _consultation_fee,
      _room_cost,
      _doctor_payout,
      _room_cost, 
      _platform_commission,
      0.05,
      'pending',
      _week_start_date,
      NOW()
    );

    _payouts_created := _payouts_created + 1;
  END LOOP;

  -- 2. CALCULATE AND UPSERT WEEKLY SETTLEMENT (Aríme vs Corpo)
  
  -- A. Get total rental income from APPOINTMENTS (sum matching payouts for this week)
  SELECT COALESCE(SUM(clinic_revenue), 0) INTO _total_appt_rental_income
  FROM public.payouts
  WHERE week_start_date = _week_start_date;

  -- B. Get total rental income from DIRECT RENTALS (room_rentals table)
  SELECT COALESCE(SUM(total_price), 0) INTO _direct_rental_income
  FROM public.room_rentals
  WHERE status IN ('paid', 'confirmed') 
  AND start_time >= _week_start_date 
  AND start_time < _week_end_date;

  _total_rental_income := _total_appt_rental_income + _direct_rental_income;

  -- Calculate Split
  _arime_amount := _total_rental_income * (_arime_commission_percent / 100.0);
  _corpo_amount := _total_rental_income - _arime_amount;

  -- Upsert Settlement Record
  INSERT INTO public.weekly_settlements (
    week_start_date,
    total_rental_income,
    arime_commission_rate,
    arime_amount,
    corpo_oriente_amount,
    updated_at
  ) VALUES (
    _week_start_date,
    _total_rental_income,
    _arime_commission_percent,
    _arime_amount,
    _corpo_amount,
    NOW()
  )
  ON CONFLICT (week_start_date) DO UPDATE SET
    total_rental_income = EXCLUDED.total_rental_income,
    arime_commission_rate = EXCLUDED.arime_commission_rate,
    arime_amount = EXCLUDED.arime_amount,
    corpo_oriente_amount = EXCLUDED.corpo_oriente_amount,
    updated_at = NOW();

  -- Return summary
  RETURN QUERY
  SELECT 
    COUNT(*)::INT,
    COALESCE(SUM(consultation_fee), 0)::DECIMAL,
    COALESCE(SUM(room_rental_cost), 0)::DECIMAL,
    COALESCE(SUM(doctor_payout), 0)::DECIMAL,
    COALESCE(SUM(platform_commission), 0)::DECIMAL,
    _payouts_created,
    TRUE::BOOLEAN -- arime_payment_created
  FROM public.payouts
  WHERE week_start_date = _week_start_date;
END;
$$;
