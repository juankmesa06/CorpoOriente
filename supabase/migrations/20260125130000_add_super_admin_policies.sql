-- Enable Super Admin access to all critical tables

-- 1. Policies for profiles
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.profiles;
create policy "Super Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super Admins can update all profiles" ON public.profiles;
create policy "Super Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

-- 2. Policies for patient_profiles
DROP POLICY IF EXISTS "Super Admins can view all patient_profiles" ON public.patient_profiles;
create policy "Super Admins can view all patient_profiles"
  on public.patient_profiles for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super Admins can update all patient_profiles" ON public.patient_profiles;
create policy "Super Admins can update all patient_profiles"
  on public.patient_profiles for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

-- 3. Policies for doctor_profiles
DROP POLICY IF EXISTS "Super Admins can view all doctor_profiles" ON public.doctor_profiles;
create policy "Super Admins can view all doctor_profiles"
  on public.doctor_profiles for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super Admins can update all doctor_profiles" ON public.doctor_profiles;
create policy "Super Admins can update all doctor_profiles"
  on public.doctor_profiles for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

-- 4. Policies for appointments (just in case they are missing too)
DROP POLICY IF EXISTS "Super Admins can view all appointments" ON public.appointments;
create policy "Super Admins can view all appointments"
  on public.appointments for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super Admins can update all appointments" ON public.appointments;
create policy "Super Admins can update all appointments"
  on public.appointments for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

-- 5. Policies for payments
DROP POLICY IF EXISTS "Super Admins can manage all payments" ON public.payments;
create policy "Super Admins can manage all payments"
  on public.payments for all
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );
