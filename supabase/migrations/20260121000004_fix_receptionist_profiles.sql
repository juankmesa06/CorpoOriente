-- Permitir que los recepcionistas vean todos los perfiles
-- Esto es necesario para que puedan ver los nombres de los doctores y pacientes
CREATE POLICY "Receptionists can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'receptionist'));
