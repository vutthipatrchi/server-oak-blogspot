create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.articles (
  id bigint generated always as identity primary key,
  category text not null check (category in ('Thinker', 'Writer', 'Literature')),
  tags text[] not null default '{}',
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  excerpt text not null,
  image_url text,
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
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_status_idx on public.articles (status);
create index if not exists comments_article_id_idx on public.comments (article_id);

drop trigger if exists set_articles_updated_at on public.articles;
create trigger set_articles_updated_at before update on public.articles
for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
alter table public.comments enable row level security;

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

insert into public.categories (name) values ('Thinker'), ('Writer'), ('Literature') on conflict do nothing;

create table if not exists public.admin_profiles (
  id bigint primary key default 1 check (id = 1),
  name text not null,
  email text not null,
  bio text not null default '',
  avatar_url text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments
add column if not exists member_id uuid references auth.users(id) on delete set null;

create table if not exists public.article_likes (
  article_id bigint not null references public.articles(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, member_id)
);

alter table public.categories enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.member_profiles enable row level security;
alter table public.article_likes enable row level security;

drop policy if exists "Categories are readable by everyone" on public.categories;
create policy "Categories are readable by everyone" on public.categories for select using (true);

drop policy if exists "Admin profile is readable" on public.admin_profiles;
create policy "Admin profile is readable" on public.admin_profiles for select using (true);

drop policy if exists "Articles are readable by everyone" on public.articles;
create policy "Articles are readable by everyone" on public.articles for select using (true);

drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone" on public.comments for select using (true);
