-- Keep the cached article like count correct under concurrent requests.
begin;

update public.articles as article
set likes = (
  select count(*)::integer
  from public.article_likes
  where article_likes.article_id = article.id
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

commit;
