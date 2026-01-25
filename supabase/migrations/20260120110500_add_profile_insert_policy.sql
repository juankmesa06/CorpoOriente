-- Policy: Allow users to insert their own profile
-- This enables self-healing if the profile creation trigger failed or didn't exist.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
