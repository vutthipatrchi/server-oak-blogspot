begin;

alter table public.comments
  add column if not exists reply_to_comment_id bigint
  references public.comments(id) on delete cascade;

create index if not exists comments_reply_to_comment_id_idx
  on public.comments (reply_to_comment_id);

create table if not exists public.comment_likes (
  comment_id bigint not null references public.comments(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, member_id)
);

alter table public.comment_likes enable row level security;

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('new_comment', 'article_like', 'comment_reply', 'comment_like')),
  article_id bigint references public.articles(id) on delete cascade,
  article_title text not null default '',
  comment_id bigint references public.comments(id) on delete set null,
  actor_name text not null default 'Member',
  comment_preview text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications" on public.notifications
  for select using (auth.uid() = recipient_id);

drop policy if exists "Users can mark their own notifications read" on public.notifications;
create policy "Users can mark their own notifications read" on public.notifications
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create or replace function public.create_notification(
  target_user_id uuid,
  source_user_id uuid,
  notification_type text,
  source_article_id bigint,
  source_comment_id bigint,
  source_comment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_actor_name text;
  resolved_article_title text;
begin
  if target_user_id is null or target_user_id = source_user_id
    or not exists (
      select 1 from public.profiles where id = target_user_id and role = 'member'
    ) then
    return;
  end if;

  select coalesce(name, username, 'Member') into resolved_actor_name
  from public.profiles where id = source_user_id;
  select coalesce(title, '') into resolved_article_title
  from public.articles where id = source_article_id;

  insert into public.notifications (
    recipient_id, actor_id, event_type, article_id, article_title,
    comment_id, actor_name, comment_preview
  ) values (
    target_user_id, source_user_id, notification_type, source_article_id,
    coalesce(resolved_article_title, ''), source_comment_id,
    coalesce(resolved_actor_name, 'Member'), left(coalesce(source_comment, ''), 180)
  );
end;
$$;

create or replace function public.notify_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author_id uuid;
begin
  if new.reply_to_comment_id is not null then
    select member_id into parent_author_id
    from public.comments where id = new.reply_to_comment_id;
    perform public.create_notification(
      parent_author_id, new.member_id, 'comment_reply', new.article_id, new.id, new.text
    );
  end if;

  insert into public.notifications (
    recipient_id, actor_id, event_type, article_id, article_title,
    comment_id, actor_name, comment_preview
  )
  select profile.id, new.member_id, 'new_comment', new.article_id,
    article.title, new.id, coalesce(actor.name, actor.username, 'Member'), left(new.text, 180)
  from public.profiles as profile
  join public.articles as article on article.id = new.article_id
  left join public.profiles as actor on actor.id = new.member_id
  where profile.role in ('owner', 'admin')
    and profile.id is distinct from new.member_id;

  return new;
end;
$$;

drop trigger if exists notify_comment_activity on public.comments;
create trigger notify_comment_activity after insert on public.comments
  for each row execute function public.notify_comment_activity();

create or replace function public.notify_article_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    recipient_id, actor_id, event_type, article_id, article_title, actor_name
  )
  select profile.id, new.member_id, 'article_like', article.id, article.title,
    coalesce(actor.name, actor.username, 'Member')
  from public.profiles as profile
  join public.articles as article on article.id = new.article_id
  left join public.profiles as actor on actor.id = new.member_id
  where profile.role in ('owner', 'admin') and profile.id <> new.member_id;
  return new;
end;
$$;

drop trigger if exists notify_article_like on public.article_likes;
create trigger notify_article_like after insert on public.article_likes
  for each row execute function public.notify_article_like();

create or replace function public.notify_comment_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_row public.comments%rowtype;
begin
  select * into comment_row from public.comments where id = new.comment_id;
  if not found then return new; end if;
  perform public.create_notification(
    comment_row.member_id, new.member_id, 'comment_like', comment_row.article_id,
    comment_row.id, comment_row.text
  );
  return new;
end;
$$;

drop trigger if exists notify_comment_like on public.comment_likes;
create trigger notify_comment_like after insert on public.comment_likes
  for each row execute function public.notify_comment_like();

commit;
