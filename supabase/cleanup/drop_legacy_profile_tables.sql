-- Run only after every backend instance reads and writes public.profiles.
begin;
drop table if exists public.member_profiles;
drop table if exists public.admin_profiles;
commit;
