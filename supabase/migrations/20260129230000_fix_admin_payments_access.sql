-- Migration: 20260129230000_fix_admin_payments_access.sql
-- Description: Grant comprehensive access to 'admin' and 'super_admin' roles across all critical tables.

-- Function to check if current user is an admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (is_admin());

-- 2. Patient Profiles
DROP POLICY IF EXISTS "Admins can view all patient_profiles" ON public.patient_profiles;
CREATE POLICY "Admins can view all patient_profiles" ON public.patient_profiles FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can update all patient_profiles" ON public.patient_profiles;
CREATE POLICY "Admins can update all patient_profiles" ON public.patient_profiles FOR UPDATE USING (is_admin());

-- 3. Doctor Profiles
DROP POLICY IF EXISTS "Admins can view all doctor_profiles" ON public.doctor_profiles;
CREATE POLICY "Admins can view all doctor_profiles" ON public.doctor_profiles FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can update all doctor_profiles" ON public.doctor_profiles;
CREATE POLICY "Admins can update all doctor_profiles" ON public.doctor_profiles FOR UPDATE USING (is_admin());

-- 4. Appointments
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments" ON public.appointments FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
CREATE POLICY "Admins can manage all appointments" ON public.appointments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 5. Payments
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 6. Room Rentals
DROP POLICY IF EXISTS "Admins can manage all room_rentals" ON public.room_rentals;
CREATE POLICY "Admins can manage all room_rentals" ON public.room_rentals FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 7. Payouts (Weekly cuts)
DROP POLICY IF EXISTS "Admins can manage all payouts" ON public.payouts;
CREATE POLICY "Admins can manage all payouts" ON public.payouts FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 8. User Roles (Allow admins to see who has what role)
DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
CREATE POLICY "Admins can view all user_roles" ON public.user_roles FOR SELECT USING (is_admin());
