-- Dedicated to the public Open Space agenda. Never stores participant identities.
begin;
create table public.open_space_topics (
  id uuid primary key,
  starts_at timestamptz not null,
  table_no smallint not null check (table_no between 1 and 5),
  topic text not null check (char_length(btrim(topic)) between 1 and 120),
  unique (starts_at, table_no)
);
alter table public.open_space_topics enable row level security;
revoke all on public.open_space_topics from public, anon, authenticated;
grant select, insert on public.open_space_topics to anon, authenticated;
create policy read_agenda on public.open_space_topics for select to anon, authenticated using (true);
create policy propose_topic on public.open_space_topics for insert to anon, authenticated
with check (starts_at >= now() and starts_at <= now() + interval '90 days'
  and extract(minute from starts_at at time zone 'Asia/Jerusalem') = 0
  and extract(second from starts_at) = 0);
commit;
