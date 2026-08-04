-- Run only after the category_id-based backend has been deployed everywhere.
begin;

drop trigger if exists sync_article_category on public.articles;
drop function if exists public.sync_article_category();
drop trigger if exists sync_category_name_to_articles on public.categories;
drop function if exists public.sync_category_name_to_articles();
drop index if exists public.articles_category_idx;
alter table public.articles drop column if exists category;

commit;
