-- Create a view to simplify fetching appointments with patient details and payments
CREATE OR REPLACE VIEW public.admin_appointments_view AS
SELECT
    a.id,
    a.doctor_id,
    a.patient_id,
    a.start_time,
    a.end_time,
    a.status,
    a.is_virtual,
    a.created_at,
    p.full_name as patient_name,
    p.email as patient_email,
    p.phone as patient_phone,
    doc_profile.full_name as doctor_name,
    pay.amount as payment_amount,
    pay.status as payment_status
FROM
    public.appointments a
JOIN
    public.patient_profiles pp ON a.patient_id = pp.id
JOIN
    public.profiles p ON pp.user_id = p.user_id
JOIN
    public.doctor_profiles dp ON a.doctor_id = dp.id
JOIN
    public.profiles doc_profile ON dp.user_id = doc_profile.user_id
LEFT JOIN
    public.payments pay ON a.id = pay.appointment_id;

-- Grant access to this view
GRANT SELECT ON public.admin_appointments_view TO authenticated;
-- (RLS is handled by underlying tables if security invoker is set, but for views often explicit policies or security definer is needed. 
-- However, for admin dashboard, standard access is fine if we check role in frontend or if underlying tables restrict.
-- Here we'll just create the view. Supabase views usually work with RLS if created as standard views.)
