-- Create doctor_tasks table
CREATE TABLE public.doctor_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('urgent', 'normal', 'low')) DEFAULT 'normal',
    is_completed BOOLEAN DEFAULT false,
    patient_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Doctors can view their own tasks"
    ON public.doctor_tasks FOR SELECT
    USING (
        doctor_id IN (
            SELECT id FROM public.doctor_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can insert their own tasks"
    ON public.doctor_tasks FOR INSERT
    WITH CHECK (
        doctor_id IN (
            SELECT id FROM public.doctor_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can update their own tasks"
    ON public.doctor_tasks FOR UPDATE
    USING (
        doctor_id IN (
            SELECT id FROM public.doctor_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can delete their own tasks"
    ON public.doctor_tasks FOR DELETE
    USING (
        doctor_id IN (
            SELECT id FROM public.doctor_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_doctor_tasks_updated_at
    BEFORE UPDATE ON public.doctor_tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
