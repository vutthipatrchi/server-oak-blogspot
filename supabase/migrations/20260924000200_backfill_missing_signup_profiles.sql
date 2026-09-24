-- Accounts created while email confirmation was enabled did not get a profile
-- until their first email login. Restore those profiles for username login.
with missing as (
  select
    auth_user.id,
    auth_user.email,
    coalesce(nullif(trim(auth_user.raw_user_meta_data ->> 'name'), ''), 'Member') as name,
    lower(nullif(trim(auth_user.raw_user_meta_data ->> 'username'), '')) as requested_username,
    auth_user.raw_app_meta_data ->> 'role' as metadata_role,
    row_number() over (
      partition by lower(nullif(trim(auth_user.raw_user_meta_data ->> 'username'), ''))
      order by auth_user.created_at, auth_user.id
    ) as username_position
  from auth.users as auth_user
  where auth_user.email is not null
    and not exists (select 1 from public.profiles where id = auth_user.id)
), resolved as (
  select
    missing.*,
    case
      when requested_username is not null
        and username_position = 1
        and not exists (
          select 1 from public.profiles
          where username = missing.requested_username
        )
      then requested_username
      else 'user-' || id::text
    end as resolved_username
  from missing
)
insert into public.profiles (id, email, name, username, role)
select
  id,
  email,
  name,
  resolved_username,
  case when metadata_role in ('owner', 'admin') then metadata_role else 'member' end
from resolved
on conflict (id) do nothing;
