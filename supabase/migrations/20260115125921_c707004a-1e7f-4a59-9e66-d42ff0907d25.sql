-- Create surveys table
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id),
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'expired')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

-- Create survey_responses table
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE UNIQUE,
  doctor_rating INTEGER NOT NULL CHECK (doctor_rating BETWEEN 1 AND 5),
  punctuality_rating INTEGER NOT NULL CHECK (punctuality_rating BETWEEN 1 AND 5),
  clarity_rating INTEGER NOT NULL CHECK (clarity_rating BETWEEN 1 AND 5),
  treatment_rating INTEGER NOT NULL CHECK (treatment_rating BETWEEN 1 AND 5),
  comment TEXT,
  average_score NUMERIC(3,2) GENERATED ALWAYS AS (
    (doctor_rating + punctuality_rating + clarity_rating + treatment_rating)::NUMERIC / 4
  ) STORED,
  has_admin_alert BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for surveys
CREATE POLICY "Admins can manage all surveys"
ON public.surveys FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Patients can view their own surveys"
ON public.surveys FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patient_profiles pp
  WHERE pp.id = surveys.patient_id AND pp.user_id = auth.uid()
));

CREATE POLICY "Patients can update their own pending surveys"
ON public.surveys FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM patient_profiles pp
  WHERE pp.id = surveys.patient_id AND pp.user_id = auth.uid()
) AND status IN ('pending', 'sent'));

-- RLS Policies for survey_responses
CREATE POLICY "Admins can manage all survey responses"
ON public.survey_responses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Patients can view their own responses"
ON public.survey_responses FOR SELECT
USING (EXISTS (
  SELECT 1 FROM surveys s
  JOIN patient_profiles pp ON s.patient_id = pp.id
  WHERE s.id = survey_responses.survey_id AND pp.user_id = auth.uid()
));

CREATE POLICY "Patients can insert their own responses"
ON public.survey_responses FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM surveys s
  JOIN patient_profiles pp ON s.patient_id = pp.id
  WHERE s.id = survey_responses.survey_id 
    AND pp.user_id = auth.uid()
    AND s.status IN ('pending', 'sent')
));

-- Function to generate surveys for completed appointments
CREATE OR REPLACE FUNCTION public.generate_pending_surveys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  survey_count INTEGER := 0;
  apt RECORD;
BEGIN
  FOR apt IN
    SELECT a.id, a.end_time, a.patient_id, a.doctor_id
    FROM appointments a
    WHERE a.status = 'completed'
      AND a.end_time <= now()
      AND NOT EXISTS (
        SELECT 1 FROM surveys s WHERE s.appointment_id = a.id
      )
  LOOP
    INSERT INTO surveys (
      appointment_id,
      patient_id,
      doctor_id,
      scheduled_for
    ) VALUES (
      apt.id,
      apt.patient_id,
      apt.doctor_id,
      apt.end_time + INTERVAL '2 hours'
    );
    survey_count := survey_count + 1;
  END LOOP;

  RETURN survey_count;
END;
$$;

-- Function to submit survey response
CREATE OR REPLACE FUNCTION public.submit_survey_response(
  _token TEXT,
  _doctor_rating INTEGER,
  _punctuality_rating INTEGER,
  _clarity_rating INTEGER,
  _treatment_rating INTEGER,
  _comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  survey_record RECORD;
  avg_score NUMERIC;
  needs_alert BOOLEAN;
  response_id UUID;
BEGIN
  -- Find survey by token
  SELECT * INTO survey_record
  FROM surveys
  WHERE token = _token AND status IN ('pending', 'sent');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Encuesta no encontrada o ya completada');
  END IF;

  -- Calculate average
  avg_score := (_doctor_rating + _punctuality_rating + _clarity_rating + _treatment_rating)::NUMERIC / 4;
  needs_alert := avg_score < 3;

  -- Insert response
  INSERT INTO survey_responses (
    survey_id,
    doctor_rating,
    punctuality_rating,
    clarity_rating,
    treatment_rating,
    comment,
    has_admin_alert
  ) VALUES (
    survey_record.id,
    _doctor_rating,
    _punctuality_rating,
    _clarity_rating,
    _treatment_rating,
    _comment,
    needs_alert
  )
  RETURNING id INTO response_id;

  -- Update survey status
  UPDATE surveys SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = survey_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Encuesta enviada exitosamente',
    'response_id', response_id,
    'alert_generated', needs_alert
  );
END;
$$;

-- Function for doctor aggregated metrics (no individual responses)
CREATE OR REPLACE FUNCTION public.get_doctor_survey_metrics(_doctor_id UUID)
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
    'total_surveys', COUNT(*),
    'average_overall', ROUND(AVG(sr.average_score), 2),
    'average_doctor_rating', ROUND(AVG(sr.doctor_rating), 2),
    'average_punctuality', ROUND(AVG(sr.punctuality_rating), 2),
    'average_clarity', ROUND(AVG(sr.clarity_rating), 2),
    'average_treatment', ROUND(AVG(sr.treatment_rating), 2),
    'ratings_distribution', jsonb_build_object(
      '5_stars', COUNT(*) FILTER (WHERE sr.average_score >= 4.5),
      '4_stars', COUNT(*) FILTER (WHERE sr.average_score >= 3.5 AND sr.average_score < 4.5),
      '3_stars', COUNT(*) FILTER (WHERE sr.average_score >= 2.5 AND sr.average_score < 3.5),
      '2_stars', COUNT(*) FILTER (WHERE sr.average_score >= 1.5 AND sr.average_score < 2.5),
      '1_star', COUNT(*) FILTER (WHERE sr.average_score < 1.5)
    )
  ) INTO result
  FROM surveys s
  JOIN survey_responses sr ON s.id = sr.survey_id
  WHERE s.doctor_id = _doctor_id AND s.status = 'completed';

  RETURN COALESCE(result, jsonb_build_object(
    'total_surveys', 0,
    'average_overall', null,
    'message', 'No hay encuestas completadas'
  ));
END;
$$;

-- Function for admin to get alerts
CREATE OR REPLACE FUNCTION public.get_survey_alerts()
RETURNS TABLE(
  survey_id UUID,
  appointment_id UUID,
  doctor_name TEXT,
  patient_name TEXT,
  average_score NUMERIC,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id as survey_id,
    s.appointment_id,
    doc_profile.full_name as doctor_name,
    pat_profile.full_name as patient_name,
    sr.average_score,
    s.completed_at
  FROM surveys s
  JOIN survey_responses sr ON s.id = sr.survey_id
  JOIN doctor_profiles dp ON s.doctor_id = dp.id
  JOIN profiles doc_profile ON dp.user_id = doc_profile.user_id
  JOIN patient_profiles pp ON s.patient_id = pp.id
  JOIN profiles pat_profile ON pp.user_id = pat_profile.user_id
  WHERE sr.has_admin_alert = true
  ORDER BY s.completed_at DESC;
$$;

-- Indexes for performance
CREATE INDEX idx_surveys_appointment_id ON public.surveys(appointment_id);
CREATE INDEX idx_surveys_patient_id ON public.surveys(patient_id);
CREATE INDEX idx_surveys_doctor_id ON public.surveys(doctor_id);
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_surveys_token ON public.surveys(token);
CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_has_alert ON public.survey_responses(has_admin_alert) WHERE has_admin_alert = true;