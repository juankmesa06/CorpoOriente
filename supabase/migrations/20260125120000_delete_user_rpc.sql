-- Create a function to allow super admins to delete users
create or replace function public.delete_user_by_id(user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the executing user is a super admin
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
    and ur.role = 'super_admin'
  ) then
    raise exception 'Access denied: Only super admins can delete users';
  end if;

  -- Delete the user from auth.users
  -- This will cascade to profiles and other tables if foreign keys are set up with ON DELETE CASCADE
  delete from auth.users where id = user_id;
end;
$$;
