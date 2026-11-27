-- NAESOAU: link a membership registration to the authenticated Supabase account.
-- BACK UP your database before applying. Run this in Supabase SQL Editor.
-- This migration does NOT automatically claim/link existing student records.

begin;

alter table public.registrations
  add column if not exists user_id uuid;

-- Keep the link valid when an auth account is deleted; the membership record remains
-- available to executives for review rather than being cascade-deleted.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.registrations'::regclass
      and conname = 'registrations_user_id_fkey'
  ) then
    alter table public.registrations
      add constraint registrations_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

create unique index if not exists registrations_user_id_unique
  on public.registrations(user_id)
  where user_id is not null;

commit;

-- NEXT: inspect existing policies BEFORE changing them. Do not leave the old
-- anonymous INSERT ... WITH CHECK (true) policy enabled once account-only
-- registration is enforced. Policy names differ between projects.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('registrations', 'payments')
order by tablename, policyname;
