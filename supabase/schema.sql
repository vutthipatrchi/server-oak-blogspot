create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

insert into public.categories (name) values ('Thinker'), ('Writer'), ('Literature') on conflict do nothing;

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

create table if not exists public.articles (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.categories(id) on update cascade on delete restrict,
  tags text[] not null default '{}',
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  excerpt text not null,
  image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  author text not null,
  author_avatar text,
  author_bio text[] not null default '{}',
  display_date text,
  published_at date,
  likes integer not null default 0 check (likes >= 0),
  sections jsonb not null default '[]'::jsonb,
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles
add column if not exists status text not null default 'draft';

alter table public.articles
add column if not exists author_id uuid references public.profiles(id) on delete set null;

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  article_id bigint not null references public.articles(id) on delete cascade,
  author text not null,
  avatar text,
  display_date text,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_category_id_idx on public.articles (category_id);
create index if not exists articles_status_idx on public.articles (status);
create index if not exists articles_author_id_idx on public.articles (author_id);
create index if not exists comments_article_id_idx on public.comments (article_id);
create index if not exists profiles_role_idx on public.profiles (role);

drop trigger if exists set_articles_updated_at on public.articles;
create trigger set_articles_updated_at before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
alter table public.comments enable row level security;

alter table public.comments
add column if not exists member_id uuid references public.profiles(id) on delete set null;

create table if not exists public.article_likes (
  article_id bigint not null references public.articles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, member_id)
);

create or replace function public.update_article_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set likes = likes + 1 where id = new.article_id;
    return new;
  end if;

  update public.articles set likes = greatest(0, likes - 1) where id = old.article_id;
  return old;
end;
$$;

drop trigger if exists update_article_like_count on public.article_likes;
create trigger update_article_like_count
after insert or delete on public.article_likes
for each row execute function public.update_article_like_count();

alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.article_likes enable row level security;

drop policy if exists "Categories are readable by everyone" on public.categories;
create policy "Categories are readable by everyone" on public.categories for select using (true);

drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Articles are readable by everyone" on public.articles;
drop policy if exists "Published articles are readable by everyone" on public.articles;
create policy "Published articles are readable by everyone" on public.articles
for select using (status = 'published');

drop policy if exists "Comments are readable by everyone" on public.comments;
drop policy if exists "Published article comments are readable by everyone" on public.comments;
create policy "Published article comments are readable by everyone" on public.comments
for select using (exists (
  select 1 from public.articles
  where articles.id = comments.article_id and articles.status = 'published'
));
