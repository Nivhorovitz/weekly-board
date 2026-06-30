-- Community Events Board / Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  community_id text not null default 'sparkco',
  title text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time,
  host text,
  category text default 'מפגש קהילה',
  status text default 'פתוח',
  room_url text,
  registration_url text,
  is_featured boolean default false,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists events_community_date_idx
on public.events (community_id, date, start_time);

alter table public.events enable row level security;

-- Public viewers can read only published events.
create policy "Public can read published events"
on public.events for select
using (is_published = true);

-- MVP policy: authenticated users can manage events.
-- For production, restrict this to an admin/community role table.
create policy "Authenticated can manage events"
on public.events for all
to authenticated
using (true)
with check (true);

-- Optional seed data for Sparkco
insert into public.events (community_id, title, description, date, start_time, end_time, host, category, status, is_featured, is_published)
values
('sparkco', 'מעגל פתיחה שבועי', 'מפגש קהילתי קצר לפתיחת השבוע, חיבור, כוונה ועדכונים חשובים.', current_date + interval '1 day', '20:30', '21:30', 'צוות הקהילה', 'מפגש קהילה', 'פתוח', true, true),
('sparkco', 'סדנת עומק למובילים', 'עבודה מעשית על יצירת שגרה קהילתית, אירועי שיא ומנוע אונבורדינג.', current_date + interval '4 days', '18:00', '19:30', 'ניב', 'סדנה', 'בקרוב', false, true);
