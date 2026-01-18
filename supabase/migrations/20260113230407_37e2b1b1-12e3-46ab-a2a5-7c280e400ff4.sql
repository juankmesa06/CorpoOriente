-- =============================================
-- FUNCIONES DE REPORTES PARA ADMIN
-- =============================================

-- 1. REPORTE DE INGRESOS POR DÍA
CREATE OR REPLACE FUNCTION public.report_income_by_day(
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  total_income DECIMAL,
  payments_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(p.paid_at) as date,
    SUM(p.amount) as total_income,
    COUNT(*) as payments_count
  FROM payments p
  WHERE p.status = 'paid'
    AND DATE(p.paid_at) BETWEEN _start_date AND _end_date
  GROUP BY DATE(p.paid_at)
  ORDER BY date DESC;
$$;

-- 2. REPORTE DE INGRESOS POR MES
CREATE OR REPLACE FUNCTION public.report_income_by_month(
  _months_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  year INTEGER,
  month INTEGER,
  month_name TEXT,
  total_income DECIMAL,
  payments_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXTRACT(YEAR FROM p.paid_at)::INTEGER as year,
    EXTRACT(MONTH FROM p.paid_at)::INTEGER as month,
    TO_CHAR(p.paid_at, 'Month') as month_name,
    SUM(p.amount) as total_income,
    COUNT(*) as payments_count
  FROM payments p
  WHERE p.status = 'paid'
    AND p.paid_at >= CURRENT_DATE - (_months_back || ' months')::INTERVAL
  GROUP BY EXTRACT(YEAR FROM p.paid_at), EXTRACT(MONTH FROM p.paid_at), TO_CHAR(p.paid_at, 'Month')
  ORDER BY year DESC, month DESC;
$$;

-- 3. REPORTE DE INGRESOS POR MÉDICO
CREATE OR REPLACE FUNCTION public.report_income_by_doctor(
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  doctor_id UUID,
  doctor_name TEXT,
  specialty TEXT,
  total_income DECIMAL,
  appointments_count BIGINT,
  avg_per_appointment DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    dp.id as doctor_id,
    pr.full_name as doctor_name,
    dp.specialty,
    SUM(p.amount) as total_income,
    COUNT(*) as appointments_count,
    ROUND(AVG(p.amount), 2) as avg_per_appointment
  FROM payments p
  JOIN appointments a ON p.appointment_id = a.id
  JOIN doctor_profiles dp ON a.doctor_id = dp.id
  JOIN profiles pr ON dp.user_id = pr.user_id
  WHERE p.status = 'paid'
    AND DATE(p.paid_at) BETWEEN _start_date AND _end_date
  GROUP BY dp.id, pr.full_name, dp.specialty
  ORDER BY total_income DESC;
$$;

-- 4. REPORTE DE INGRESOS POR CONSULTORIO
CREATE OR REPLACE FUNCTION public.report_income_by_room(
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  total_income DECIMAL,
  appointments_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id as room_id,
    r.name as room_name,
    SUM(p.amount) as total_income,
    COUNT(*) as appointments_count
  FROM payments p
  JOIN appointments a ON p.appointment_id = a.id
  JOIN rooms r ON a.room_id = r.id
  WHERE p.status = 'paid'
    AND a.room_id IS NOT NULL
    AND DATE(p.paid_at) BETWEEN _start_date AND _end_date
  GROUP BY r.id, r.name
  ORDER BY total_income DESC;
$$;

-- 5. REPORTE DE CITAS POR ESTADO
CREATE OR REPLACE FUNCTION public.report_appointments_by_status(
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  percentage DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT COUNT(*) as total
    FROM appointments
    WHERE DATE(start_time) BETWEEN _start_date AND _end_date
  )
  SELECT 
    a.status::TEXT,
    COUNT(*) as count,
    ROUND((COUNT(*)::DECIMAL / NULLIF(t.total, 0)) * 100, 2) as percentage
  FROM appointments a, totals t
  WHERE DATE(a.start_time) BETWEEN _start_date AND _end_date
  GROUP BY a.status, t.total
  ORDER BY count DESC;
$$;

-- 6. REPORTE DE HORAS USADAS POR CONSULTORIO
CREATE OR REPLACE FUNCTION public.report_room_hours(
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  total_hours DECIMAL,
  appointments_count BIGINT,
  avg_hours_per_day DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id as room_id,
    r.name as room_name,
    SUM(EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 3600)::DECIMAL as total_hours,
    COUNT(*) as appointments_count,
    ROUND(
      SUM(EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 3600)::DECIMAL / 
      NULLIF((_end_date - _start_date + 1), 0), 2
    ) as avg_hours_per_day
  FROM appointments a
  JOIN rooms r ON a.room_id = r.id
  WHERE a.room_id IS NOT NULL
    AND a.status NOT IN ('cancelled', 'no_show')
    AND DATE(a.start_time) BETWEEN _start_date AND _end_date
  GROUP BY r.id, r.name
  ORDER BY total_hours DESC;
$$;

-- 7. REPORTE DE OCUPACIÓN POR CONSULTORIO (diario/mensual)
CREATE OR REPLACE FUNCTION public.report_room_occupancy(
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE,
  _working_hours_per_day INTEGER DEFAULT 14 -- 7am-9pm = 14 horas
)
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  total_available_hours DECIMAL,
  total_used_hours DECIMAL,
  occupancy_percentage DECIMAL,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH room_usage AS (
    SELECT 
      r.id as room_id,
      r.name as room_name,
      COALESCE(SUM(EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 3600), 0)::DECIMAL as used_hours
    FROM rooms r
    LEFT JOIN appointments a ON r.id = a.room_id
      AND a.status NOT IN ('cancelled', 'no_show')
      AND DATE(a.start_time) BETWEEN _start_date AND _end_date
    WHERE r.is_active = true
    GROUP BY r.id, r.name
  )
  SELECT 
    ru.room_id,
    ru.room_name,
    ((_end_date - _start_date + 1) * _working_hours_per_day)::DECIMAL as total_available_hours,
    ru.used_hours as total_used_hours,
    ROUND(
      (ru.used_hours / NULLIF(((_end_date - _start_date + 1) * _working_hours_per_day)::DECIMAL, 0)) * 100, 2
    ) as occupancy_percentage,
    CASE 
      WHEN (ru.used_hours / NULLIF(((_end_date - _start_date + 1) * _working_hours_per_day)::DECIMAL, 0)) * 100 < 30 THEN 'subutilizado'
      WHEN (ru.used_hours / NULLIF(((_end_date - _start_date + 1) * _working_hours_per_day)::DECIMAL, 0)) * 100 < 70 THEN 'normal'
      ELSE 'alta_demanda'
    END as status
  FROM room_usage ru
  ORDER BY occupancy_percentage DESC;
$$;

-- 8. REPORTE DE PAGOS (resumen)
CREATE OR REPLACE FUNCTION public.report_payments_summary(
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  total_amount DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.status::TEXT,
    COUNT(*) as count,
    SUM(p.amount) as total_amount
  FROM payments p
  WHERE DATE(p.created_at) BETWEEN _start_date AND _end_date
  GROUP BY p.status
  ORDER BY total_amount DESC;
$$;

-- 9. REPORTE DASHBOARD RESUMEN
CREATE OR REPLACE FUNCTION public.report_dashboard_summary(
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', _start_date,
      'end_date', _end_date,
      'days', _end_date - _start_date + 1
    ),
    'income', (
      SELECT jsonb_build_object(
        'total', COALESCE(SUM(amount), 0),
        'count', COUNT(*)
      )
      FROM payments
      WHERE status = 'paid'
        AND DATE(paid_at) BETWEEN _start_date AND _end_date
    ),
    'appointments', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'no_show', COUNT(*) FILTER (WHERE status = 'no_show'),
        'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled')
      )
      FROM appointments
      WHERE DATE(start_time) BETWEEN _start_date AND _end_date
    ),
    'payments', (
      SELECT jsonb_build_object(
        'paid', jsonb_build_object(
          'count', COUNT(*) FILTER (WHERE status = 'paid'),
          'total', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)
        ),
        'pending', jsonb_build_object(
          'count', COUNT(*) FILTER (WHERE status = 'pending'),
          'total', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)
        ),
        'credits', jsonb_build_object(
          'generated', COUNT(*) FILTER (WHERE status = 'credit'),
          'total', COALESCE(SUM(amount) FILTER (WHERE status = 'credit'), 0)
        ),
        'credits_used', jsonb_build_object(
          'count', COUNT(*) FILTER (WHERE status = 'refunded'),
          'total', COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0)
        )
      )
      FROM payments
      WHERE DATE(created_at) BETWEEN _start_date AND _end_date
    ),
    'rooms', (
      SELECT jsonb_build_object(
        'total_active', COUNT(*) FILTER (WHERE is_active = true),
        'avg_occupancy', (
          SELECT ROUND(AVG(occupancy_percentage), 2)
          FROM report_room_occupancy(_start_date, _end_date)
        )
      )
      FROM rooms
    )
  ) INTO result;
  
  RETURN result;
END;
$$;