-- 1. Permitir que cualquier usuario autenticado vea los perfiles básicos (solo lectura)
-- Esto es necesario para que los pacientes vean el nombre de los doctores
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. Permitir que cualquier usuario autenticado vea los perfiles de doctores
-- Esto permite listar especialistas en la reserva de citas
CREATE POLICY "Doctor profiles are viewable by authenticated users"
ON public.doctor_profiles FOR SELECT
TO authenticated
USING (true);

-- 3. Backfill: Crear entradas faltantes en doctor_profiles para usuarios con rol 'doctor'
-- Buscamos en auth.users a los que tengan el rol en metadata pero no registro en doctor_profiles
INSERT INTO public.doctor_profiles (user_id, specialty)
SELECT 
    id, 
    COALESCE(raw_user_meta_data ->> 'specialty', 'Psicoterapeuta') as specialty
FROM auth.users
WHERE 
    (raw_user_meta_data ->> 'role') = 'doctor'
    AND id NOT IN (SELECT user_id FROM public.doctor_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Asegurar que también tengan entrada en la tabla profiles (si el trigger falló por alguna razón)
INSERT INTO public.profiles (user_id, full_name, email)
SELECT 
    id, 
    COALESCE(raw_user_meta_data ->> 'full_name', 'Doctor'),
    email
FROM auth.users
WHERE 
    (raw_user_meta_data ->> 'role') = 'doctor'
    AND id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;
