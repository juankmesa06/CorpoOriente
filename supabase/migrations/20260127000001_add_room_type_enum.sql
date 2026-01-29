-- Add Room Type Enum to support Polymorphic Space Management
-- Types: physical (consulting rooms), virtual (digital infrastructure), event (event halls)

-- 1. Create room_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_type') THEN
    CREATE TYPE public.room_type AS ENUM ('physical', 'virtual', 'event');
  END IF;
END $$;

-- 2. Add room_type column to rooms table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS room_type public.room_type DEFAULT 'physical' NOT NULL;

-- 3. Migrate existing rooms to 'physical' type (already done by DEFAULT, but explicit for clarity)
UPDATE public.rooms
SET room_type = 'physical'
WHERE room_type IS NULL;

-- 4. Add type-specific metadata columns (optional, for future use)
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 5. Add comments for documentation
COMMENT ON COLUMN public.rooms.room_type IS 'Type of space: physical (consulting room), virtual (digital infra), event (event hall)';
COMMENT ON COLUMN public.rooms.metadata IS 'Type-specific data: virtual URLs, event capacity details, etc.';
COMMENT ON COLUMN public.rooms.price_per_hour IS 'Hourly rental rate for this space';
COMMENT ON COLUMN public.rooms.price_per_session IS 'Per-session rental rate for this space';

-- 6. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_rooms_type ON public.rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(is_active) WHERE is_active = true;
