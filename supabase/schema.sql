-- =====================================================================
-- Termini – Supabase database schema
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- Safe on a fresh project. Creates tables, security rules (RLS),
-- double-booking protection and helper functions.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------- Tables ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text not null default '',
  phone       text not null default '',
  role        text not null default 'client' check (role in ('client','business','admin')),
  created_at  timestamptz not null default now()
);

create table if not exists public.salons (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (length(name) between 2 and 80),
  category    text not null default 'barber' check (category in ('barber','salon','nails','spa')),
  city        text not null,
  address     text not null,
  phone       text not null default '',
  description text not null default '',
  -- 7 entries, index 0 = Sunday: null (closed) or {"open":"09:00","close":"19:00"}
  hours       jsonb not null default '[null,{"open":"09:00","close":"19:00"},{"open":"09:00","close":"19:00"},{"open":"09:00","close":"19:00"},{"open":"09:00","close":"19:00"},{"open":"09:00","close":"19:00"},{"open":"09:00","close":"17:00"}]',
  status      text not null default 'pending' check (status in ('pending','active','suspended')),
  plan        text not null default 'trial' check (plan in ('trial','pro')),
  plan_until  date,
  accepting   boolean not null default true,   -- owner's "Online" switch
  approved_at timestamptz,                      -- first approval; the free trial starts here
  created_at  timestamptz not null default now()
);
alter table public.salons add column if not exists accepting boolean not null default true;
alter table public.salons add column if not exists approved_at timestamptz;
alter table public.salons add column if not exists photos jsonb not null default '[]';      -- [{url, path}] in Storage bucket salon-photos
alter table public.salons add column if not exists rating_avg numeric(3,2);                 -- kept up to date by the reviews trigger
alter table public.salons add column if not exists rating_count int not null default 0;
create unique index if not exists salons_one_per_owner on public.salons(owner_id);  -- one salon per business account
create index if not exists salons_status_city on public.salons(status, city);

create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  name        text not null,
  price       numeric(10,2) not null default 0 check (price >= 0),
  duration    int not null default 30 check (duration between 5 and 600),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists services_salon on public.services(salon_id);

create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists staff_salon on public.staff(salon_id);

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  salon_id     uuid not null references public.salons(id) on delete cascade,
  service_id   uuid references public.services(id) on delete set null,
  staff_id     uuid references public.staff(id) on delete set null,
  client_id    uuid not null references public.profiles(id) on delete cascade,
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  price        numeric(10,2) not null default 0,
  status       text not null default 'confirmed' check (status in ('confirmed','completed','cancelled','no_show')),
  note         text not null default '' check (length(note) <= 300),
  -- snapshots, so history stays readable if a service/staff is deleted
  service_name text not null default '',
  staff_name   text not null default '',
  client_name  text not null default '',
  client_phone text not null default '',
  walk_in      boolean not null default false,  -- added by the salon for a client without the app
  created_at   timestamptz not null default now(),
  constraint bookings_end_after_start check (end_at > start_at),
  -- The database itself refuses two active bookings for the same staff member at overlapping times
  constraint bookings_no_overlap exclude using gist (staff_id with =, tstzrange(start_at, end_at) with &&)
    where (status in ('confirmed','completed'))
);
alter table public.bookings add column if not exists walk_in boolean not null default false;
create index if not exists bookings_salon_time on public.bookings(salon_id, start_at);
create index if not exists bookings_client on public.bookings(client_id, start_at);

-- ---------- Helper functions ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.owns_salon(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.salons where id = sid and owner_id = auth.uid());
$$;

-- New sign-up → profile row. Nobody can sign up as admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', ''),
          coalesce(new.raw_user_meta_data->>'phone', ''),
          case when new.raw_user_meta_data->>'role' = 'business' then 'business' else 'client' end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users can't change their own role/email (admin and the SQL editor can).
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id; new.role := old.role; new.email := old.email; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- Owners can't approve themselves or change their plan.
-- The 30-day free trial starts on the FIRST approval (pending -> active).
create or replace function public.protect_salon() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- internal updates from the reviews trigger skip the owner checks
  if coalesce(current_setting('termini.sys', true), '') = '1' then return new; end if;
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.owner_id := auth.uid(); new.status := 'pending'; new.plan := 'trial'; new.plan_until := null; new.approved_at := null;
      new.rating_avg := null; new.rating_count := 0;
    else
      new.owner_id := old.owner_id; new.status := old.status; new.plan := old.plan;
      new.plan_until := old.plan_until; new.approved_at := old.approved_at;
      new.rating_avg := old.rating_avg; new.rating_count := old.rating_count;
    end if;
  end if;
  if new.status = 'active' and new.approved_at is null then
    new.approved_at := now();
    if new.plan = 'trial' and new.plan_until is null then new.plan_until := current_date + 30; end if;
  end if;
  return new;
end $$;
drop trigger if exists salons_protect on public.salons;
create trigger salons_protect before insert or update on public.salons
  for each row execute function public.protect_salon();

-- Bookings: price, end time and names come from the database, not the phone.
-- Checks opening hours (Europe/Tirane time). After creation only the status can change;
-- clients may only cancel.
create or replace function public.prepare_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sv public.services; st public.staff; sl public.salons; pr public.profiles;
  tz constant text := 'Europe/Tirane';
  loc_start timestamp; loc_end timestamp; h jsonb; is_owner boolean;
begin
  if tg_op = 'INSERT' then
    select * into sl from public.salons where id = new.salon_id;
    if not found then raise exception 'NOT_FOUND'; end if;
    is_owner := auth.uid() is null or public.is_admin() or sl.owner_id = auth.uid();
    if not is_owner and (sl.status <> 'active' or not sl.accepting or (sl.plan_until is not null and sl.plan_until < current_date)) then
      raise exception 'NOT_ACCEPTING';
    end if;
    select * into sv from public.services where id = new.service_id and salon_id = new.salon_id and active;
    if not found then raise exception 'NOT_FOUND'; end if;
    select * into st from public.staff where id = new.staff_id and salon_id = new.salon_id and active;
    if not found then raise exception 'NOT_FOUND'; end if;
    if auth.uid() is not null then new.client_id := auth.uid(); end if;
    select * into pr from public.profiles where id = new.client_id;

    new.end_at := new.start_at + make_interval(mins => sv.duration);
    if auth.uid() is not null and new.start_at < now() - interval '5 minutes' then raise exception 'IN_PAST'; end if;
    loc_start := new.start_at at time zone tz; loc_end := new.end_at at time zone tz;
    h := sl.hours -> extract(dow from loc_start)::int;
    if h is null or jsonb_typeof(h) <> 'object' or loc_start::date <> loc_end::date
       or loc_start::time < (h->>'open')::time or loc_end::time > (h->>'close')::time then
      raise exception 'CLOSED';
    end if;

    new.price := sv.price; new.status := 'confirmed';
    new.service_name := sv.name; new.staff_name := st.name;
    if is_owner and new.walk_in then
      new.client_name := coalesce(nullif(trim(new.client_name), ''), '—'); new.client_phone := coalesce(new.client_phone, '');
    else
      new.walk_in := false; new.client_name := coalesce(pr.name, ''); new.client_phone := coalesce(pr.phone, '');
    end if;
  else
    new.id := old.id; new.salon_id := old.salon_id; new.service_id := old.service_id; new.staff_id := old.staff_id;
    new.client_id := old.client_id; new.start_at := old.start_at; new.end_at := old.end_at; new.price := old.price;
    new.service_name := old.service_name; new.staff_name := old.staff_name; new.client_name := old.client_name;
    new.client_phone := old.client_phone; new.created_at := old.created_at; new.note := old.note; new.walk_in := old.walk_in;
    if auth.uid() is not null and not public.is_admin() and not public.owns_salon(old.salon_id) then
      if new.status <> 'cancelled' or old.status <> 'confirmed' then raise exception 'FORBIDDEN'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bookings_prepare on public.bookings;
create trigger bookings_prepare before insert or update on public.bookings
  for each row execute function public.prepare_booking();

-- Busy times for a salon (no client details) – used to show free slots.
create or replace function public.busy_slots(p_salon uuid, p_from timestamptz, p_to timestamptz)
returns table (staff_id uuid, start_at timestamptz, end_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.staff_id, b.start_at, b.end_at from public.bookings b
  where b.salon_id = p_salon and b.status in ('confirmed','completed') and b.start_at < p_to and b.end_at > p_from;
$$;

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  return json_build_object(
    'salons',     (select count(*) from public.salons),
    'pending',    (select count(*) from public.salons where status = 'pending'),
    'clients',    (select count(*) from public.profiles where role = 'client'),
    'bookings',   (select count(*) from public.bookings),
    'bookings30', (select count(*) from public.bookings where created_at >= now() - interval '30 days'));
end $$;

-- ---------- Reviews (stars after a completed visit) ----------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings(id) on delete cascade,
  salon_id    uuid not null references public.salons(id) on delete cascade,
  client_id   uuid not null references public.profiles(id) on delete cascade,
  client_name text not null default '',
  rating      int not null check (rating between 1 and 5),
  comment     text not null default '' check (length(comment) <= 500),
  created_at  timestamptz not null default now()
);
create index if not exists reviews_salon on public.reviews(salon_id, created_at desc);

-- Only the client of a COMPLETED booking can review it, once.
create or replace function public.prepare_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.bookings; nm text;
begin
  if tg_op = 'INSERT' then
    select * into b from public.bookings where id = new.booking_id;
    if not found or (auth.uid() is not null and b.client_id <> auth.uid()) or b.status <> 'completed' then
      raise exception 'FORBIDDEN';
    end if;
    new.salon_id := b.salon_id; new.client_id := b.client_id; new.created_at := now();
    select name into nm from public.profiles where id = b.client_id;
    nm := trim(coalesce(nm, ''));
    new.client_name := split_part(nm, ' ', 1) || case when position(' ' in nm) > 0 then ' ' || left(split_part(nm, ' ', 2), 1) || '.' else '' end;
  else
    new.id := old.id; new.booking_id := old.booking_id; new.salon_id := old.salon_id; new.client_id := old.client_id;
    new.client_name := old.client_name; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists reviews_prepare on public.reviews;
create trigger reviews_prepare before insert or update on public.reviews
  for each row execute function public.prepare_review();

create or replace function public.refresh_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare sid uuid := coalesce(new.salon_id, old.salon_id);
begin
  perform set_config('termini.sys', '1', true);
  update public.salons s set
    rating_avg = (select round(avg(rating)::numeric, 2) from public.reviews where salon_id = sid),
    rating_count = (select count(*) from public.reviews where salon_id = sid)
  where s.id = sid;
  perform set_config('termini.sys', '', true);
  return null;
end $$;
drop trigger if exists reviews_refresh on public.reviews;
create trigger reviews_refresh after insert or update or delete on public.reviews
  for each row execute function public.refresh_rating();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.salons   enable row level security;
alter table public.services enable row level security;
alter table public.staff    enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews  enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists salons_select on public.salons;
-- Clients see only approved salons whose plan has not expired
create policy salons_select on public.salons for select using (
  (status = 'active' and (plan_until is null or plan_until >= current_date)) or owner_id = auth.uid() or public.is_admin());
drop policy if exists salons_insert on public.salons;
create policy salons_insert on public.salons for insert with check (
  owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'business'));
drop policy if exists salons_update on public.salons;
create policy salons_update on public.salons for update using (owner_id = auth.uid() or public.is_admin());
drop policy if exists salons_delete on public.salons;
create policy salons_delete on public.salons for delete using (public.is_admin());

drop policy if exists services_select on public.services;
create policy services_select on public.services for select using (true);
drop policy if exists services_write on public.services;
create policy services_write on public.services for all
  using (public.owns_salon(salon_id) or public.is_admin()) with check (public.owns_salon(salon_id) or public.is_admin());

drop policy if exists staff_select on public.staff;
create policy staff_select on public.staff for select using (true);
drop policy if exists staff_write on public.staff;
create policy staff_write on public.staff for all
  using (public.owns_salon(salon_id) or public.is_admin()) with check (public.owns_salon(salon_id) or public.is_admin());

drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select
  using (client_id = auth.uid() or public.owns_salon(salon_id) or public.is_admin());
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert with check (client_id = auth.uid());
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update
  using (client_id = auth.uid() or public.owns_salon(salon_id) or public.is_admin());

drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (client_id = auth.uid());
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update using (client_id = auth.uid());
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete using (client_id = auth.uid() or public.is_admin());

-- ---------- Permissions for the API roles ----------
grant usage on schema public to anon, authenticated;
grant select on public.salons, public.services, public.staff, public.reviews to anon;
grant select, insert, update, delete on public.profiles, public.salons, public.services, public.staff, public.bookings, public.reviews to authenticated;
grant execute on function public.busy_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.is_admin(), public.owns_salon(uuid) to anon, authenticated;

-- ---------- Photo storage (free Supabase Storage, bucket "salon-photos") ----------
-- Public read; only the salon owner can upload/delete inside the folder named after the salon id.
-- Skipped automatically where the storage schema does not exist.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('salon-photos', 'salon-photos', true, 1048576, array['image/jpeg', 'image/webp', 'image/png'])
    on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png'];
    execute 'drop policy if exists "salon photos read" on storage.objects';
    execute 'create policy "salon photos read" on storage.objects for select using (bucket_id = ''salon-photos'')';
    execute 'drop policy if exists "salon photos upload" on storage.objects';
    execute 'create policy "salon photos upload" on storage.objects for insert to authenticated with check (bucket_id = ''salon-photos'' and public.owns_salon(((storage.foldername(name))[1])::uuid))';
    execute 'drop policy if exists "salon photos delete" on storage.objects';
    execute 'create policy "salon photos delete" on storage.objects for delete to authenticated using (bucket_id = ''salon-photos'' and public.owns_salon(((storage.foldername(name))[1])::uuid))';
  end if;
end $$;

-- =====================================================================
-- AFTER you sign up in the app with your own email, make yourself admin:
--   update public.profiles set role = 'admin' where email = 'YOUR@EMAIL.COM';
-- =====================================================================
