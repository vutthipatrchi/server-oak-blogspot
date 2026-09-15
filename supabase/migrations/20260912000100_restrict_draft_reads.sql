-- Administrators read drafts through the API using its service-role client.
-- Restrict direct database reads, including draft comments.
begin;
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

commit;
