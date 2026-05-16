create table if not exists public.app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'Employee' check (role in ('Employee', 'Manager', 'Admin')),
  department text not null default 'General',
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'Employee'),
    coalesce(nullif(new.raw_user_meta_data->>'department', ''), 'General')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.app_state enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Allow public demo reads" on public.app_state;
drop policy if exists "Allow authenticated app reads" on public.app_state;
create policy "Allow authenticated app reads"
on public.app_state
for select
to authenticated
using (true);

drop policy if exists "Allow public demo writes" on public.app_state;
drop policy if exists "Allow authenticated app writes" on public.app_state;
create policy "Allow authenticated app writes"
on public.app_state
for insert
to authenticated
with check (true);

drop policy if exists "Allow public demo updates" on public.app_state;
drop policy if exists "Allow authenticated app updates" on public.app_state;
create policy "Allow authenticated app updates"
on public.app_state
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated profile reads" on public.profiles;
create policy "Allow authenticated profile reads"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Allow users to create own profile" on public.profiles;
drop policy if exists "Allow users to update own profile" on public.profiles;

-- Profile creation, role assignment, and hierarchy changes must be done by an Admin
-- through the Supabase dashboard or a service-role backend API. The browser app
-- intentionally exposes no public signup and no client-side role mutation policy.

-- After creating your three users in Supabase Authentication, set their journeys here.
-- Replace these email addresses with your real backend users.

-- Employee user:
-- update public.profiles
-- set full_name = 'Employee User', role = 'Employee', department = 'Sales'
-- where email = 'employee@example.com';

-- Manager user:
-- update public.profiles
-- set full_name = 'Manager User', role = 'Manager', department = 'Business'
-- where email = 'manager@example.com';

-- Admin user:
-- update public.profiles
-- set full_name = 'Admin User', role = 'Admin', department = 'Human Resources'
-- where email = 'admin@example.com';

-- Assign employees to the manager for L1 approval workflow:
-- update public.profiles employee
-- set manager_id = manager.id
-- from public.profiles manager
-- where employee.email = 'employee@example.com'
-- and manager.email = 'manager@example.com';
