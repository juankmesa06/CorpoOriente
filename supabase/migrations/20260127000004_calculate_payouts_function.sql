-- Payout Calculation Function for Weekly Financial Distribution
-- Calculates doctor payouts, clinic revenue, and platform commission

-- 1. Create function to calculate payouts for a given week
CREATE OR REPLACE FUNCTION public.calculate_weekly_payouts(
  _week_start_date DATE,
  _platform_commission_rate DECIMAL DEFAULT 0.05 -- 5% default
)
RETURNS TABLE (
  total_appointments INT,
  total_consultation_fees DECIMAL,
  total_room_rentals DECIMAL,
  total_doctor_payouts DECIMAL,
  total_platform_commission DECIMAL,
  payouts_created INT
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
BEGIN
  -- Calculate week end date (week_start + 7 days)
  _week_end_date := _week_start_date + INTERVAL '7 days';

  -- Process each completed appointment from the week
  FOR _appointment IN
    SELECT 
      a.id AS appointment_id,
      a.doctor_id,
      a.room_id,
      a.start_time,
      a.end_time,
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
      -- Don't reprocess if payout already exists
      AND NOT EXISTS (
        SELECT 1 FROM public.payouts
        WHERE appointment_id = a.id
      )
  LOOP
    -- Calculate duration in hours
    _duration_hours := EXTRACT(EPOCH FROM (_appointment.end_time - _appointment.start_time)) / 3600.0;
    
    -- Calculate room rental cost (0 if no room or virtual appointment)
    IF _appointment.room_id IS NOT NULL AND _appointment.room_hourly_rate IS NOT NULL THEN
      _room_cost := _appointment.room_hourly_rate * _duration_hours;
    ELSE
      _room_cost := 0;
    END IF;

    -- Use actual payment amount as consultation fee
    _consultation_fee := COALESCE(_appointment.payment_amount, _appointment.doctor_fee, 0);
    
    -- Calculate platform commission (percentage of consultation fee)
    _platform_commission := _consultation_fee * _platform_commission_rate;
    
    -- Calculate doctor payout (consultation fee - room cost - platform commission)
    _doctor_payout := _consultation_fee - _room_cost - _platform_commission;

    -- Ensure doctor payout is not negative
    IF _doctor_payout < 0 THEN
      _doctor_payout := 0;
      RAISE WARNING 'Negative payout adjusted to 0 for appointment %', _appointment.appointment_id;
    END IF;

    -- Insert payout record
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
      _room_cost, -- clinic_revenue = room_rental_cost
      _platform_commission,
      _platform_commission_rate,
      'pending',
      _week_start_date,
      NOW()
    );

    _payouts_created := _payouts_created + 1;
  END LOOP;

  -- Return summary statistics
  RETURN QUERY
  SELECT 
    COUNT(*)::INT AS total_appointments,
    COALESCE(SUM(consultation_fee), 0)::DECIMAL AS total_consultation_fees,
    COALESCE(SUM(room_rental_cost), 0)::DECIMAL AS total_room_rentals,
    COALESCE(SUM(doctor_payout), 0)::DECIMAL AS total_doctor_payouts,
    COALESCE(SUM(platform_commission), 0)::DECIMAL AS total_platform_commission,
    _payouts_created AS payouts_created
  FROM public.payouts
  WHERE week_start_date = _week_start_date;
END;
$$;

-- 2. Grant execute permissions to admins
GRANT EXECUTE ON FUNCTION public.calculate_weekly_payouts TO authenticated;

-- 3. Create helper function to get last Monday's date (for cron jobs)
CREATE OR REPLACE FUNCTION public.get_last_monday()
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT - 6)::DATE;
$$;

-- 4. Create function to mark payouts as processed
CREATE OR REPLACE FUNCTION public.mark_payouts_processed(
  _payout_ids UUID[],
  _payment_gateway TEXT DEFAULT NULL,
  _payment_references TEXT[] DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _updated_count INT;
  _payout_id UUID;
  _idx INT := 1;
BEGIN
  -- Update each payout
  FOREACH _payout_id IN ARRAY _payout_ids
  LOOP
    UPDATE public.payouts
    SET 
      status = 'processed',
      processed_at = NOW(),
      payment_gateway = COALESCE(_payment_gateway, payment_gateway),
      payment_reference = CASE 
        WHEN _payment_references IS NOT NULL THEN _payment_references[_idx]
        ELSE payment_reference
      END
    WHERE id = _payout_id
      AND status = 'pending';
    
    _idx := _idx + 1;
  END LOOP;

  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RETURN _updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payouts_processed TO authenticated;

-- 5. Add comments
COMMENT ON FUNCTION public.calculate_weekly_payouts IS 
  'Calculates payouts for all completed/paid appointments in the given week. Returns summary statistics.';
COMMENT ON FUNCTION public.get_last_monday IS 
  'Returns the date of the most recent Monday (for weekly payout calculations)';
COMMENT ON FUNCTION public.mark_payouts_processed IS 
  'Marks specified payouts as processed and optionally adds payment gateway info';
