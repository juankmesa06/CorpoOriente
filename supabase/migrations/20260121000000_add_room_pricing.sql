-- Agregar columnas de precio a la tabla rooms
ALTER TABLE public.rooms 
ADD COLUMN price_per_hour DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN price_per_session DECIMAL(10, 2) DEFAULT 0;

-- Comentario para documentar
COMMENT ON COLUMN public.rooms.price_per_hour IS 'Precio de alquiler por hora';
COMMENT ON COLUMN public.rooms.price_per_session IS 'Precio de alquiler por sesión/turno';
