-- Validar y corregir la eliminación en cascada para pagos
-- Solucionando el error: "update or delete on table "appointments" violates foreign key constraint "payments_appointment_id_fkey" on table "payments""

-- Corrección: Asegurar que payments tenga ON DELETE CASCADE hacia appointments
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_appointment_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_appointment_id_fkey
FOREIGN KEY (appointment_id)
REFERENCES public.appointments(id)
ON DELETE CASCADE;

-- NOTA: No modificamos appointments.doctor_id ni doctor_profiles.user_id porque:
-- 1. appointments.doctor_id referencia a doctor_profiles(id) (no a users) y ya tiene ON DELETE CASCADE en su definición original.
-- 2. doctor_profiles.user_id referencia a auth.users(id) y ya tiene ON DELETE CASCADE en su definición original.
-- Intentar cambiar appointments.doctor_id para referenciar a auth.users causaría errores de integridad (como el que viste) porque los IDs no coinciden.
