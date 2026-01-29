
-- Policy: Doctors can view payments related to their appointments
CREATE POLICY "Doctors can view payments for their appointments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = payments.appointment_id
    AND a.doctor_id = (SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid())
  )
);

-- Policy: Doctors can view rentals related to their appointments
-- Case 1: The rental is linked to an appointment the doctor owns
CREATE POLICY "Doctors can view rentals for their appointments"
ON public.room_rentals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.rental_id = room_rentals.id
    AND a.doctor_id = (SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid())
  )
);

-- Case 2: The rental was created by the doctor directly (Independent Rental)
CREATE POLICY "Doctors can view their own rentals"
ON public.room_rentals
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);
