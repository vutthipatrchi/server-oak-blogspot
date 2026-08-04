begin;

insert into public.categories (name)
select distinct category
from public.articles
where category is not null and btrim(category) <> ''
on conflict (name) do nothing;

alter table public.articles
add column if not exists category_id bigint;

update public.articles as article
set category_id = category.id
from public.categories as category
where article.category_id is null
  and category.name = article.category;

do $$
begin
  if exists (select 1 from public.articles where category_id is null) then
    raise exception 'Cannot migrate articles: one or more category values have no matching category row.';
  end if;
end;
$$;

alter table public.articles
drop constraint if exists articles_category_check;

alter table public.articles
drop constraint if exists articles_category_id_fkey;

alter table public.articles
add constraint articles_category_id_fkey
foreign key (category_id) references public.categories(id)
on update cascade on delete restrict;

alter table public.articles
alter column category_id set not null;

create index if not exists articles_category_id_idx
on public.articles (category_id);

-- Compatibility bridge: the old API writes `category`, while the new API writes
-- `category_id`. Keep both synchronized until the new backend has been deployed.
create or replace function public.sync_article_category()
returns trigger
language plpgsql
as $$
declare
  resolved_category public.categories%rowtype;
begin
  if tg_op = 'UPDATE' and new.category is distinct from old.category then
    select * into resolved_category
    from public.categories
    where name = new.category;
  elsif new.category_id is not null then
    select * into resolved_category
    from public.categories
    where id = new.category_id;
  elsif new.category is not null then
    select * into resolved_category
    from public.categories
    where name = new.category;
  end if;

  if resolved_category.id is null then
    raise exception 'Article category does not exist.';
  end if;

  new.category_id := resolved_category.id;
  new.category := resolved_category.name;
  return new;
end;
$$;

drop trigger if exists sync_article_category on public.articles;
create trigger sync_article_category
before insert or update of category, category_id on public.articles
for each row execute function public.sync_article_category();

create or replace function public.sync_category_name_to_articles()
returns trigger
language plpgsql
as $$
begin
  update public.articles
  set category = new.name
  where category_id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_category_name_to_articles on public.categories;
create trigger sync_category_name_to_articles
after update of name on public.categories
for each row execute function public.sync_category_name_to_articles();

commit;
