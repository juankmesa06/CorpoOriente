-- Add Foreign Key relationships to allow PostgREST embedding (joining tables)
-- This allows queries like: patient_profiles(profiles(full_name))

ALTER TABLE public.patient_profiles
ADD CONSTRAINT fk_patient_profiles_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.doctor_profiles
ADD CONSTRAINT fk_doctor_profiles_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
