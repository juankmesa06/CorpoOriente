-- Restrict Doctor Self-Registration
-- This migration prevents public users from creating doctor accounts
-- Only admin/super_admin can assign the 'doctor' role

-- 1. Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- 2. Create restrictive policy: only admins can insert doctor roles
CREATE POLICY "Only admins can create doctor roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    -- Allow if inserting a non-doctor role for yourself
    (role != 'doctor' AND user_id = auth.uid())
    OR
    -- Allow if you are admin/super_admin (can assign any role to anyone)
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 3. Update handle_new_user() to reject doctor role from public signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_role public.app_role;
BEGIN
  -- 1. Insert basic profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    NEW.email
  );

  -- 2. Get role from metadata, default to 'patient'
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'patient'::public.app_role);

  -- 3. SECURITY: Force 'patient' if someone tries to self-assign 'doctor' via public signup
  -- Only service_role (Edge Functions) can create doctors
  IF user_role = 'doctor' AND current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    user_role := 'patient';
    RAISE WARNING 'Attempted to self-assign doctor role. Defaulting to patient.';
  END IF;

  -- 4. Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  -- 5. Create role-specific profile
  IF user_role = 'doctor' THEN
    INSERT INTO public.doctor_profiles (user_id, specialty)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'specialty', 'General'));
  ELSIF user_role = 'patient' THEN
    INSERT INTO public.patient_profiles (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Add policy for viewing roles (users can see their own roles)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

COMMENT ON POLICY "Only admins can create doctor roles" ON public.user_roles IS 
  'Prevents public doctor self-registration. Only admin/super_admin can assign doctor role.';
