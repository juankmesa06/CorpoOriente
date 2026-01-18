-- Modificar la función handle_new_user para procesar el rol desde los metadatos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_role public.app_role;
BEGIN
  -- 1. Insertar en perfiles básicos
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    NEW.email
  );

  -- 2. Obtener el rol de los metadatos (por defecto 'patient' si no viene nada)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'patient'::public.app_role);

  -- 3. Insertar en la tabla de roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  -- 4. Crear perfil específico según el rol
  IF user_role = 'doctor' THEN
    INSERT INTO public.doctor_profiles (user_id, specialty)
    VALUES (NEW.id, 'General'); -- Especialidad por defecto
  ELSIF user_role = 'patient' THEN
    INSERT INTO public.patient_profiles (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
