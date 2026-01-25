-- Add rental_id to appointments to track which room was rented for this appointment
ALTER TABLE public.appointments 
ADD COLUMN rental_id UUID REFERENCES public.room_rentals(id) ON DELETE SET NULL,
ADD COLUMN location_confirmed BOOLEAN DEFAULT false;

-- Add appointment_id to room_rentals to track which appointment this rental is for
ALTER TABLE public.room_rentals
ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_appointments_rental_id ON public.appointments(rental_id);
CREATE INDEX idx_room_rentals_appointment_id ON public.room_rentals(appointment_id);
