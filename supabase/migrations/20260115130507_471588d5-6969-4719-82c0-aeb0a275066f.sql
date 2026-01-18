-- Create medical_records table (one per patient)
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) UNIQUE,
  blood_type TEXT,
  chronic_conditions TEXT[],
  current_medications TEXT[],
  surgical_history TEXT[],
  family_history TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create medical_record_entries table (versioned clinical notes)
CREATE TABLE public.medical_record_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID NOT NULL REFERENCES public.medical_records(id),
  appointment_id UUID REFERENCES public.appointments(id),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  -- Clinical data
  chief_complaint TEXT NOT NULL,
  diagnosis TEXT,
  evolution TEXT,
  treatment_plan TEXT,
  observations TEXT,
  vital_signs JSONB,
  attachments TEXT[],
  -- Metadata
  is_current BOOLEAN NOT NULL DEFAULT true,
  parent_entry_id UUID REFERENCES public.medical_record_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create medical_record_audit table
CREATE TABLE public.medical_record_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID REFERENCES public.medical_records(id),
  entry_id UUID REFERENCES public.medical_record_entries(id),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'export')),
  action_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_record_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_record_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medical_records
CREATE POLICY "Admins can view all medical records"
ON public.medical_records FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Doctors can view their patients records"
ON public.medical_records FOR SELECT
USING (EXISTS (
  SELECT 1 FROM doctor_patients dp
  JOIN doctor_profiles doc ON dp.doctor_id = doc.id
  WHERE dp.patient_id = medical_records.patient_id
    AND doc.user_id = auth.uid()
    AND dp.status = 'active'
));

CREATE POLICY "Doctors can create records for their patients"
ON public.medical_records FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM doctor_patients dp
  JOIN doctor_profiles doc ON dp.doctor_id = doc.id
  WHERE dp.patient_id = medical_records.patient_id
    AND doc.user_id = auth.uid()
    AND dp.status = 'active'
));

CREATE POLICY "Doctors can update their patients records"
ON public.medical_records FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM doctor_patients dp
  JOIN doctor_profiles doc ON dp.doctor_id = doc.id
  WHERE dp.patient_id = medical_records.patient_id
    AND doc.user_id = auth.uid()
    AND dp.status = 'active'
));

CREATE POLICY "Patients can view their own record"
ON public.medical_records FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patient_profiles pp
  WHERE pp.id = medical_records.patient_id AND pp.user_id = auth.uid()
));

-- RLS Policies for medical_record_entries
CREATE POLICY "Admins can view all entries"
ON public.medical_record_entries FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Doctors can view entries for their patients"
ON public.medical_record_entries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM medical_records mr
  JOIN doctor_patients dp ON mr.patient_id = dp.patient_id
  JOIN doctor_profiles doc ON dp.doctor_id = doc.id
  WHERE mr.id = medical_record_entries.medical_record_id
    AND doc.user_id = auth.uid()
    AND dp.status = 'active'
));

CREATE POLICY "Doctors can create entries for their patients"
ON public.medical_record_entries FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM medical_records mr
  JOIN doctor_patients dp ON mr.patient_id = dp.patient_id
  JOIN doctor_profiles doc ON dp.doctor_id = doc.id
  WHERE mr.id = medical_record_entries.medical_record_id
    AND doc.user_id = auth.uid()
    AND dp.status = 'active'
));

CREATE POLICY "Patients can view their own entries"
ON public.medical_record_entries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM medical_records mr
  JOIN patient_profiles pp ON mr.patient_id = pp.id
  WHERE mr.id = medical_record_entries.medical_record_id
    AND pp.user_id = auth.uid()
));

-- RLS Policies for medical_record_audit
CREATE POLICY "Admins can view all audits"
ON public.medical_record_audit FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.medical_record_audit FOR INSERT
WITH CHECK (true);

-- Function to create or get medical record
CREATE OR REPLACE FUNCTION public.get_or_create_medical_record(_patient_id UUID, _created_by UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_id UUID;
BEGIN
  -- Check if record exists
  SELECT id INTO record_id FROM medical_records WHERE patient_id = _patient_id;
  
  IF record_id IS NULL THEN
    INSERT INTO medical_records (patient_id, created_by)
    VALUES (_patient_id, _created_by)
    RETURNING id INTO record_id;
  END IF;
  
  RETURN record_id;
END;
$$;

-- Function to create clinical entry with versioning
CREATE OR REPLACE FUNCTION public.create_medical_entry(
  _patient_id UUID,
  _doctor_id UUID,
  _appointment_id UUID,
  _chief_complaint TEXT,
  _diagnosis TEXT DEFAULT NULL,
  _evolution TEXT DEFAULT NULL,
  _treatment_plan TEXT DEFAULT NULL,
  _observations TEXT DEFAULT NULL,
  _vital_signs JSONB DEFAULT NULL,
  _attachments TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_id UUID;
  entry_id UUID;
  doctor_user_id UUID;
BEGIN
  -- Get doctor's user_id for audit
  SELECT user_id INTO doctor_user_id FROM doctor_profiles WHERE id = _doctor_id;
  
  -- Verify doctor-patient relationship
  IF NOT EXISTS (
    SELECT 1 FROM doctor_patients 
    WHERE doctor_id = _doctor_id AND patient_id = _patient_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tiene relación activa con este paciente');
  END IF;

  -- Get or create medical record
  record_id := get_or_create_medical_record(_patient_id, doctor_user_id);

  -- Create entry
  INSERT INTO medical_record_entries (
    medical_record_id,
    appointment_id,
    doctor_id,
    chief_complaint,
    diagnosis,
    evolution,
    treatment_plan,
    observations,
    vital_signs,
    attachments
  ) VALUES (
    record_id,
    _appointment_id,
    _doctor_id,
    _chief_complaint,
    _diagnosis,
    _evolution,
    _treatment_plan,
    _observations,
    _vital_signs,
    _attachments
  )
  RETURNING id INTO entry_id;

  -- Audit log
  INSERT INTO medical_record_audit (medical_record_id, entry_id, user_id, action, action_details)
  VALUES (record_id, entry_id, doctor_user_id, 'create', jsonb_build_object(
    'appointment_id', _appointment_id,
    'chief_complaint', _chief_complaint
  ));

  RETURN jsonb_build_object(
    'success', true,
    'entry_id', entry_id,
    'medical_record_id', record_id
  );
END;
$$;

-- Function to update entry (creates new version)
CREATE OR REPLACE FUNCTION public.update_medical_entry(
  _entry_id UUID,
  _doctor_id UUID,
  _chief_complaint TEXT,
  _diagnosis TEXT DEFAULT NULL,
  _evolution TEXT DEFAULT NULL,
  _treatment_plan TEXT DEFAULT NULL,
  _observations TEXT DEFAULT NULL,
  _vital_signs JSONB DEFAULT NULL,
  _attachments TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_entry RECORD;
  new_entry_id UUID;
  doctor_user_id UUID;
BEGIN
  -- Get doctor's user_id
  SELECT user_id INTO doctor_user_id FROM doctor_profiles WHERE id = _doctor_id;

  -- Get old entry
  SELECT * INTO old_entry FROM medical_record_entries WHERE id = _entry_id AND is_current = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entrada no encontrada');
  END IF;

  -- Verify doctor-patient relationship
  IF NOT EXISTS (
    SELECT 1 FROM medical_records mr
    JOIN doctor_patients dp ON mr.patient_id = dp.patient_id
    WHERE mr.id = old_entry.medical_record_id 
      AND dp.doctor_id = _doctor_id 
      AND dp.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado para modificar este registro');
  END IF;

  -- Mark old entry as not current
  UPDATE medical_record_entries SET is_current = false WHERE id = _entry_id;

  -- Create new version
  INSERT INTO medical_record_entries (
    medical_record_id,
    appointment_id,
    doctor_id,
    version,
    chief_complaint,
    diagnosis,
    evolution,
    treatment_plan,
    observations,
    vital_signs,
    attachments,
    parent_entry_id
  ) VALUES (
    old_entry.medical_record_id,
    old_entry.appointment_id,
    _doctor_id,
    old_entry.version + 1,
    _chief_complaint,
    _diagnosis,
    _evolution,
    _treatment_plan,
    _observations,
    _vital_signs,
    _attachments,
    _entry_id
  )
  RETURNING id INTO new_entry_id;

  -- Audit log
  INSERT INTO medical_record_audit (medical_record_id, entry_id, user_id, action, action_details)
  VALUES (old_entry.medical_record_id, new_entry_id, doctor_user_id, 'update', jsonb_build_object(
    'previous_entry_id', _entry_id,
    'new_version', old_entry.version + 1
  ));

  RETURN jsonb_build_object(
    'success', true,
    'entry_id', new_entry_id,
    'version', old_entry.version + 1
  );
END;
$$;

-- Function to log view access
CREATE OR REPLACE FUNCTION public.log_medical_record_access(
  _medical_record_id UUID,
  _user_id UUID,
  _action TEXT DEFAULT 'view'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO medical_record_audit (medical_record_id, user_id, action)
  VALUES (_medical_record_id, _user_id, _action);
END;
$$;

-- Function to get patient medical history
CREATE OR REPLACE FUNCTION public.get_patient_medical_history(_patient_id UUID)
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
    'medical_record', (
      SELECT jsonb_build_object(
        'id', mr.id,
        'blood_type', mr.blood_type,
        'chronic_conditions', mr.chronic_conditions,
        'current_medications', mr.current_medications,
        'surgical_history', mr.surgical_history,
        'family_history', mr.family_history,
        'created_at', mr.created_at
      )
      FROM medical_records mr
      WHERE mr.patient_id = _patient_id
    ),
    'entries', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'version', e.version,
          'chief_complaint', e.chief_complaint,
          'diagnosis', e.diagnosis,
          'evolution', e.evolution,
          'treatment_plan', e.treatment_plan,
          'observations', e.observations,
          'vital_signs', e.vital_signs,
          'attachments', e.attachments,
          'created_at', e.created_at,
          'doctor', jsonb_build_object(
            'id', dp.id,
            'specialty', dp.specialty,
            'name', p.full_name
          ),
          'appointment_date', a.start_time
        ) ORDER BY e.created_at DESC
      ), '[]'::jsonb)
      FROM medical_record_entries e
      JOIN medical_records mr ON e.medical_record_id = mr.id
      JOIN doctor_profiles dp ON e.doctor_id = dp.id
      JOIN profiles p ON dp.user_id = p.user_id
      LEFT JOIN appointments a ON e.appointment_id = a.id
      WHERE mr.patient_id = _patient_id AND e.is_current = true
    ),
    'patient', (
      SELECT jsonb_build_object(
        'id', pp.id,
        'name', p.full_name,
        'date_of_birth', pp.date_of_birth,
        'gender', pp.gender,
        'allergies', pp.allergies
      )
      FROM patient_profiles pp
      JOIN profiles p ON pp.user_id = p.user_id
      WHERE pp.id = _patient_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Indexes for performance
CREATE INDEX idx_medical_records_patient ON public.medical_records(patient_id);
CREATE INDEX idx_medical_entries_record ON public.medical_record_entries(medical_record_id);
CREATE INDEX idx_medical_entries_doctor ON public.medical_record_entries(doctor_id);
CREATE INDEX idx_medical_entries_current ON public.medical_record_entries(is_current) WHERE is_current = true;
CREATE INDEX idx_medical_audit_record ON public.medical_record_audit(medical_record_id);
CREATE INDEX idx_medical_audit_user ON public.medical_record_audit(user_id);
CREATE INDEX idx_medical_audit_created ON public.medical_record_audit(created_at DESC);