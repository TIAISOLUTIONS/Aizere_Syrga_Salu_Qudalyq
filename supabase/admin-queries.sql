-- Organizers only: run in Supabase Dashboard, NOT the website.
select created_at at time zone 'Asia/Almaty' as "Уақыты",guest_name as "Аты-жөні",
 case attendance when 'alone' then 'Өзі келеді' when 'couple' then 'Жұбымен келеді' else 'Келе алмайды' end as "Жауабы",
 companion_name as "Жұбының аты-жөні",guest_count as "Адам саны"
from public.guest_responses order by created_at desc;

select count(*) as responses,coalesce(sum(guest_count),0) as confirmed_people,
 count(*) filter(where attendance='alone') as alone,
 count(*) filter(where attendance='couple') as couples,
 count(*) filter(where attendance='declined') as declined
from public.guest_responses;

select has_table_privilege('anon','public.guest_responses','SELECT') as anon_select_must_be_false,
 has_table_privilege('anon','public.guest_responses','INSERT') as anon_insert_must_be_false,
 has_function_privilege('anon','public.submit_rsvp(uuid,text,text,text)','EXECUTE') as rpc_must_be_true;
