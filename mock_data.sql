-- EXECUTE THIS IN SUPABASE SQL EDITOR

DO $$
DECLARE
    i INTEGER;
    new_user_id UUID;
    creator_id UUID; -- Variable para el created_by
    random_specialties TEXT[] := ARRAY['Cardiología', 'Psicología', 'Pediatría', 'Medicina General', 'Dermatología', 'Nutrición'];
    random_names TEXT[] := ARRAY['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Pedro', 'Lucia', 'Miguel', 'Elena', 'Jose', 'Paula'];
    random_lastnames TEXT[] := ARRAY['Rodriguez', 'Gomez', 'Martinez', 'Garcia', 'Lopez', 'Hernandez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez'];
    full_name TEXT;
    doc_id UUID;
    pat_id UUID;
    apt_date TIMESTAMPTZ;
BEGIN
    -- 1. CREATE 20 DOCTORS
    FOR i IN 1..20 LOOP
        new_user_id := gen_random_uuid();
        full_name := 'Dr. ' || random_names[1 + floor(random() * array_length(random_names, 1))::int] || ' ' || random_lastnames[1 + floor(random() * array_length(random_lastnames, 1))::int];
        
        -- Insert into auth.users 
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
            new_user_id,
            'doctor' || i || '@test.com',
            'mock_password_hash', 
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', full_name, 'role', 'doctor'), 
            now(),
            now()
        );

        -- Update the automatically created doctor_profile
        UPDATE public.doctor_profiles
        SET 
            specialty = random_specialties[1 + floor(random() * array_length(random_specialties, 1))::int],
            license_number = 'LIC-' || floor(random() * 100000)::text,
            bio = 'Medico especialista con años de experiencia.',
            consultation_duration_min = 30,
            is_virtual_enabled = (random() > 0.3)
        WHERE user_id = new_user_id;

        -- Update phone in main profiles table
        UPDATE public.profiles
        SET phone = '+57' || floor(random() * 900000000 + 3000000000)::text
        WHERE user_id = new_user_id;

    END LOOP;

    -- 2. CREATE 50 PATIENTS
    FOR i IN 1..50 LOOP
        new_user_id := gen_random_uuid();
        full_name := random_names[1 + floor(random() * array_length(random_names, 1))::int] || ' ' || random_lastnames[1 + floor(random() * array_length(random_lastnames, 1))::int];

        -- Insert into auth.users
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
            new_user_id,
            'paciente' || i || '@test.com',
            'mock_password_hash',
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', full_name, 'role', 'patient'),
            now(),
            now()
        );

        -- Update the automatically created patient_profile
        UPDATE public.patient_profiles
        SET 
            date_of_birth = (now() - (floor(random() * 365 * 50 + 365 * 18) || ' days')::interval)::date,
            blood_type = (ARRAY['A+', 'O+', 'B+', 'AB+'])[1 + floor(random() * 4)::int]
        WHERE user_id = new_user_id;

        -- Update phone in main profiles table
        UPDATE public.profiles
        SET phone = '+57' || floor(random() * 900000000 + 3000000000)::text
        WHERE user_id = new_user_id;
        
    END LOOP;

    -- 3. CREATE APPOINTMENTS
    FOR i IN 1..100 LOOP 
        -- Select doctor id AND user_id (for created_by)
        SELECT id, user_id INTO doc_id, creator_id FROM public.doctor_profiles ORDER BY random() LIMIT 1;
        SELECT id INTO pat_id FROM public.patient_profiles ORDER BY random() LIMIT 1;
        apt_date := now() + (floor(random() * 60 - 30) || ' days')::interval;
        
        IF doc_id IS NOT NULL AND pat_id IS NOT NULL THEN
            INSERT INTO public.doctor_patients (doctor_id, patient_id)
            VALUES (doc_id, pat_id)
            ON CONFLICT (doctor_id, patient_id) DO NOTHING;

            INSERT INTO public.appointments (
                doctor_id,
                patient_id,
                start_time,
                end_time,
                status,
                is_virtual,
                created_by, -- Added field
                created_at
            )
            VALUES (
                doc_id,
                pat_id,
                apt_date,
                apt_date + interval '1 hour',
                CASE 
                    WHEN apt_date < now() THEN 'completed'::public.appointment_status
                    ELSE 'confirmed'::public.appointment_status
                END,
                (random() > 0.5),
                creator_id, -- Value for created_by
                now()
            );
        END IF;
    END LOOP;

END $$;
