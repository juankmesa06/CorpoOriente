-- Actualizar función has_role para que super_admin tenga acceso de admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'super_admin') -- Super admin has all roles effectively for checks
  );
$$;

-- Políticas explícitas para super_admin en user_roles
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Políticas explícitas para super_admin en profiles
CREATE POLICY "Super admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
