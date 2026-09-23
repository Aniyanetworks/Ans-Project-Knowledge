-- ============================================================================
-- Close a privilege escalation: "profiles: users can update own non-role
-- fields" (0002) only restricts WHICH ROW a user can update, not which
-- columns — so any developer could run
--   update profiles set role = 'admin' where id = auth.uid()
-- from the browser and become an admin. RLS can't restrict columns, so a
-- trigger rejects role changes unless the caller is an admin.
--
-- Server-side calls with the service role key (n8n) have no auth.uid() and
-- are still allowed, as is promoting a user via the Supabase SQL editor.
-- ============================================================================

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change user roles'
      using errcode = '42501'; -- insufficient_privilege
  end if;
  return new;
end;
$$;

create trigger trg_profiles_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
