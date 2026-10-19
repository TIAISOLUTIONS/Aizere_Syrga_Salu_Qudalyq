-- Run once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- No guest SELECT/UPDATE/DELETE policies. Access is through a narrow INSERT RPC.
begin;
create table if not exists public.guest_responses (
  id uuid primary key,
  created_at timestamptz not null default now(),
  guest_name text not null check (char_length(guest_name) between 2 and 120),
  attendance text not null check (attendance in ('alone', 'couple', 'declined')),
  companion_name text,
  guest_count smallint generated always as (case attendance when 'couple' then 2 when 'alone' then 1 else 0 end) stored,
  message text not null default '' check (char_length(message) <= 600),
  consent_at timestamptz not null default now(),
  consent_version text not null default '2026-10-v1',
  constraint valid_companion check (
    (attendance = 'couple' and companion_name is not null and char_length(companion_name) between 2 and 120)
    or (attendance <> 'couple' and companion_name is null)
  )
);
alter table public.guest_responses enable row level security;
revoke all on public.guest_responses from public, anon, authenticated;
-- No public read access, including through the REST table endpoint.
create or replace function public.submit_rsvp(
  p_submission_id uuid,
  p_guest_name text,
  p_attendance text,
  p_companion_name text,
  p_message text,
  p_consent boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_guest_name, ''), '\s+', ' ', 'g'));
  v_companion text := btrim(regexp_replace(coalesce(p_companion_name, ''), '\s+', ' ', 'g'));
  v_message text := btrim(coalesce(p_message, ''));
  v_inserted uuid;
  v_existing public.guest_responses%rowtype;
begin
  if p_submission_id is null or p_consent is distinct from true
     or char_length(v_name) not between 2 and 120
     or p_attendance is null or p_attendance not in ('alone','couple','declined')
     or char_length(v_message) > 600
     or (p_attendance = 'couple' and char_length(v_companion) not between 2 and 120)
     or (p_attendance <> 'couple' and v_companion <> '') then
    raise exception using errcode = '22023', message = 'Invalid invitation response';
  end if;
  insert into public.guest_responses(id,guest_name,attendance,companion_name,message)
  values(p_submission_id,v_name,p_attendance,nullif(v_companion,''),v_message)
  on conflict (id) do nothing returning id into v_inserted;
  if v_inserted is not null then return v_inserted; end if;
  -- Retrying the same request is safe, but an existing response cannot be overwritten.
  select * into v_existing from public.guest_responses where id = p_submission_id;
  if v_existing.guest_name is distinct from v_name
     or v_existing.attendance is distinct from p_attendance
     or v_existing.companion_name is distinct from nullif(v_companion,'')
     or v_existing.message is distinct from v_message then
    raise exception using errcode = '23505', message = 'Submission already exists';
  end if;
  return p_submission_id;
end;
$$;
revoke all on function public.submit_rsvp(uuid,text,text,text,text,boolean) from public, anon, authenticated;
grant usage on schema public to anon;
grant execute on function public.submit_rsvp(uuid,text,text,text,text,boolean) to anon;
comment on table public.guest_responses is 'Айзере — 22.11.2026. Private RSVP responses. Dashboard access only.';
commit;
