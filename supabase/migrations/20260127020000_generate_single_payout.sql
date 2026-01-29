-- Function to generate payout for a SINGLE appointment (Immediate Wallet Update)
CREATE OR REPLACE FUNCTION public.generate_single_payout(p_appointment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appt RECORD;
  v_payment RECORD;
  v_doctor_fee DECIMAL;
  v_room_cost DECIMAL := 0;
  v_platform_commission DECIMAL;
  v_doctor_payout DECIMAL;
  v_room_rate DECIMAL;
  v_duration NUMERIC;
  v_commission_rate DECIMAL := 0.05;
  v_payout_id UUID;
BEGIN
  -- 1. Get appointment info
  SELECT a.*, dp.consultation_fee, dp.consultation_fee_virtual 
  INTO v_appt 
  FROM public.appointments a
  JOIN public.doctor_profiles dp ON a.doctor_id = dp.id
  WHERE a.id = p_appointment_id;

  IF v_appt IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;

  -- 2. Get payment info
  SELECT * INTO v_payment 
  FROM public.payments 
  WHERE appointment_id = p_appointment_id 
  AND status = 'paid'
  LIMIT 1;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found or not paid');
  END IF;

  -- 3. Check if payout already exists
  IF EXISTS (SELECT 1 FROM public.payouts WHERE appointment_id = p_appointment_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout already exists');
  END IF;

  -- 4. Calculate Values
  v_duration := EXTRACT(EPOCH FROM (v_appt.end_time - v_appt.start_time)) / 3600.0;
  
  -- Doctor Fee (Base) = Payment Amount (assuming full payment)
  v_doctor_fee := v_payment.amount;

  -- Room Cost
  IF NOT v_appt.is_virtual THEN
    -- Try to find the rental
    SELECT total_price INTO v_room_cost
    FROM public.room_rentals
    WHERE appointment_id = p_appointment_id
    LIMIT 1;
    
    -- If no rental record but it's physical, maybe look up room rate?
    -- Fallback: If room_id is set in appointment
    IF v_room_cost IS NULL AND v_appt.room_id IS NOT NULL THEN
       SELECT price_per_hour * v_duration INTO v_room_cost
       FROM public.rooms
       WHERE id = v_appt.room_id;
    END IF;
    
    v_room_cost := COALESCE(v_room_cost, 0);
  ELSE
    v_room_cost := 0;
  END IF;

  -- Platform Commission
  v_platform_commission := v_doctor_fee * v_commission_rate;

  -- Doctor Payout
  v_doctor_payout := v_doctor_fee - v_room_cost - v_platform_commission;
  
  IF v_doctor_payout < 0 THEN v_doctor_payout := 0; END IF;

  -- 5. Insert Payout
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
      v_appt.id,
      v_appt.doctor_id,
      v_doctor_fee,
      v_room_cost,
      v_doctor_payout,
      v_room_cost, -- clinic logic
      v_platform_commission,
      v_commission_rate,
      'pending',
      public.get_last_monday(), -- helper from previous migration
      NOW()
    ) RETURNING id INTO v_payout_id;

   RETURN jsonb_build_object('success', true, 'payout_id', v_payout_id, 'amount', v_doctor_payout);
END;
$$;
