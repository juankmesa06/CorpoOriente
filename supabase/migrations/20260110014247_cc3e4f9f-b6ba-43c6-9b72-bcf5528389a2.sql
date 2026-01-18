-- Tabla de consultorios
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para búsqueda rápida
CREATE INDEX idx_rooms_active ON public.rooms(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Agregar room_id a appointments (nullable porque virtuales no necesitan)
ALTER TABLE public.appointments 
  ADD COLUMN room_id UUID REFERENCES public.rooms(id);

-- Índice para consultas de disponibilidad
CREATE INDEX idx_appointments_room_time ON public.appointments(room_id, start_time, end_time) 
  WHERE room_id IS NOT NULL;

-- Función para verificar disponibilidad del consultorio
CREATE OR REPLACE FUNCTION public.check_room_availability(
  _room_id UUID,
  _start_time TIMESTAMP WITH TIME ZONE,
  _end_time TIMESTAMP WITH TIME ZONE,
  _exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE room_id = _room_id
    AND status NOT IN ('cancelled', 'no_show')
    AND (_exclude_appointment_id IS NULL OR id != _exclude_appointment_id)
    AND (
      (start_time <= _start_time AND end_time > _start_time)
      OR (start_time < _end_time AND end_time >= _end_time)
      OR (start_time >= _start_time AND end_time <= _end_time)
    );
  
  RETURN conflict_count = 0;
END;
$$;

-- RLS para rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver consultorios activos
CREATE POLICY "Anyone can view active rooms"
  ON public.rooms FOR SELECT
  USING (is_active = true);

-- Solo Admin y Recepción pueden gestionar consultorios
CREATE POLICY "Admins can manage rooms"
  ON public.rooms FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Receptionists can manage rooms"
  ON public.rooms FOR ALL
  USING (has_role(auth.uid(), 'receptionist'::app_role));

-- Insertar algunos consultorios de ejemplo
INSERT INTO public.rooms (name, description) VALUES
  ('Consultorio 1', 'Consultorio principal'),
  ('Consultorio 2', 'Consultorio secundario'),
  ('Consultorio 3', 'Consultorio de especialidades');