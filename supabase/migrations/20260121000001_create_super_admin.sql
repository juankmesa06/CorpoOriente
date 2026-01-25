-- Asignar rol de super_admin al usuario juanmesa8807@gmail.com
-- Nota: El usuario debe existir en auth.users para que esto funcione.

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar el ID del usuario por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'juanmesa8807@gmail.com';

  -- Si el usuario existe, asignarle el rol
  IF v_user_id IS NOT NULL THEN
    -- Insertar o actualizar en user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- También asegurar que tenga perfil
    INSERT INTO public.profiles (user_id, full_name, email, is_active)
    VALUES (v_user_id, 'Super Admin', 'juanmesa8807@gmail.com', true)
    ON CONFLICT (user_id) DO UPDATE
    SET is_active = true;

  ELSE
    RAISE NOTICE 'Usuario juanmesa8807@gmail.com no encontrado en auth.users';
  END IF;
END $$;
