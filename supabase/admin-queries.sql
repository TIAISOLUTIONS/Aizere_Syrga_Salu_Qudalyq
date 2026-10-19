-- FOR ORGANIZERS ONLY. Run in Dashboard SQL Editor, never in website code.
-- Full guest list, Kazakhstan time, readable statuses:
select created_at at time zone 'Asia/Almaty' as "Алматы уақыты",
  guest_name as "Аты-жөні",
  case attendance when 'alone' then 'Өзі келеді' when 'couple' then 'Жұбымен келеді' else 'Келе алмайды' end as "Жауабы",
  companion_name as "Жұбының аты-жөні", guest_count as "Адам саны", message as "Тілегі"
from public.guest_responses order by created_at desc;

-- Total confirmed people, responses and declines:
select count(*) as responses,
  coalesce(sum(guest_count),0) as confirmed_people,
  count(*) filter (where attendance='alone') as alone,
  count(*) filter (where attendance='couple') as couples,
  count(*) filter (where attendance='declined') as declined
from public.guest_responses;

-- These roles must NOT have table permissions:
select has_table_privilege('anon','public.guest_responses','SELECT') as anon_select_must_be_false,
  has_table_privilege('anon','public.guest_responses','INSERT') as anon_insert_must_be_false,
  has_function_privilege('anon','public.submit_rsvp(uuid,text,text,text,text,boolean)','EXECUTE') as rpc_must_be_true;

-- Delete/correct specific responses in Table Editor (Dashboard), not publicly.
-- Delete all guest data after the event ONLY when no longer needed:
-- delete from public.guest_responses;
