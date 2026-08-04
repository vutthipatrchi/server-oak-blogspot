begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  username text not null unique,
  bio text not null default '',
  avatar_url text not null default '',
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (
  id, email, name, username, bio, avatar_url, role, created_at, updated_at
)
select
  auth_user.id,
  auth_user.email,
  coalesce(nullif(member.name, ''), nullif(admin.name, ''), nullif(auth_user.raw_user_meta_data ->> 'name', ''), 'Member'),
  coalesce(
    nullif(member.username, ''),
    concat(split_part(auth_user.email, '@', 1), '-', left(auth_user.id::text, 8))
  ),
  coalesce(admin.bio, ''),
  coalesce(nullif(member.avatar_url, ''), nullif(admin.avatar_url, ''), nullif(auth_user.raw_user_meta_data ->> 'avatar', ''), ''),
  case
    when admin.id is not null then 'owner'
    when auth_user.raw_app_meta_data ->> 'role' = 'owner' then 'owner'
    when auth_user.raw_app_meta_data ->> 'role' = 'admin' then 'admin'
    else 'member'
  end,
  coalesce(member.created_at, auth_user.created_at, now()),
  coalesce(member.updated_at, admin.updated_at, auth_user.updated_at, now())
from auth.users as auth_user
left join public.member_profiles as member on member.id = auth_user.id
left join public.admin_profiles as admin on lower(admin.email) = lower(auth_user.email)
where auth_user.email is not null
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  username = excluded.username,
  bio = excluded.bio,
  avatar_url = excluded.avatar_url,
  role = excluded.role,
  updated_at = excluded.updated_at;

alter table public.articles drop constraint if exists articles_author_id_fkey;
alter table public.articles
add constraint articles_author_id_fkey
foreign key (author_id) references public.profiles(id) on delete set null;

alter table public.comments drop constraint if exists comments_member_id_fkey;
alter table public.comments
add constraint comments_member_id_fkey
foreign key (member_id) references public.profiles(id) on delete set null;

alter table public.article_likes drop constraint if exists article_likes_member_id_fkey;
alter table public.article_likes
add constraint article_likes_member_id_fkey
foreign key (member_id) references public.profiles(id) on delete cascade;

create index if not exists profiles_role_idx on public.profiles (role);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select using (auth.uid() = id);

commit;
