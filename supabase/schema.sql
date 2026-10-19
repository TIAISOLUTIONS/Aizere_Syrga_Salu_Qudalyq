-- UPDATED SCHEMA, v2. Run the WHOLE file in your EXISTING project's SQL Editor.
-- Existing guest rows are retained. No fabricated consent is recorded.
begin;
create table if not exists public.guest_responses (
 id uuid primary key,
 created_at timestamptz not null default now(),
 guest_name text not null check(char_length(guest_name) between 2 and 120),
 attendance text not null check(attendance in ('alone','couple','declined')),
 companion_name text,
 guest_count smallint generated always as (case attendance when 'couple' then 2 when 'alone' then 1 else 0 end) stored,
 message text not null default '' check(char_length(message)<=600),
 consent_at timestamptz,
 consent_version text,
 constraint valid_companion check((attendance='couple' and companion_name is not null and char_length(companion_name) between 2 and 120) or (attendance<>'couple' and companion_name is null))
);
-- The old columns stay for historical rows, but new submissions do NOT imply consent.
alter table public.guest_responses alter column consent_at drop not null;
alter table public.guest_responses alter column consent_at drop default;
alter table public.guest_responses alter column consent_version drop not null;
alter table public.guest_responses alter column consent_version drop default;
alter table public.guest_responses enable row level security;
revoke all on public.guest_responses from public,anon,authenticated;
-- Replace the old six-argument endpoint with the four-argument minimal endpoint.
drop function if exists public.submit_rsvp(uuid,text,text,text,text,boolean);
create or replace function public.submit_rsvp(p_submission_id uuid,p_guest_name text,p_attendance text,p_companion_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_name text:=btrim(regexp_replace(coalesce(p_guest_name,''),'\s+',' ','g'));
 v_companion text:=btrim(regexp_replace(coalesce(p_companion_name,''),'\s+',' ','g'));
 v_inserted uuid;
 v_existing public.guest_responses%rowtype;
begin
 if p_submission_id is null or char_length(v_name) not between 2 and 120
  or p_attendance is null or p_attendance not in ('alone','couple','declined')
  or (p_attendance='couple' and char_length(v_companion) not between 2 and 120)
  or (p_attendance<>'couple' and v_companion<>'') then
  raise exception using errcode='22023',message='Invalid invitation response';
 end if;
 insert into public.guest_responses(id,guest_name,attendance,companion_name,message,consent_at,consent_version)
 values(p_submission_id,v_name,p_attendance,nullif(v_companion,''),'',null,null)
 on conflict(id) do nothing returning id into v_inserted;
 if v_inserted is not null then return v_inserted;end if;
 select * into v_existing from public.guest_responses where id=p_submission_id;
 if v_existing.guest_name is distinct from v_name or v_existing.attendance is distinct from p_attendance or v_existing.companion_name is distinct from nullif(v_companion,'') then
  raise exception using errcode='23505',message='Submission already exists';
 end if;
 return p_submission_id;
end;
$$;
revoke all on function public.submit_rsvp(uuid,text,text,text) from public,anon,authenticated;
grant usage on schema public to anon;
grant execute on function public.submit_rsvp(uuid,text,text,text) to anon;
commit;
notify pgrst,'reload schema';
