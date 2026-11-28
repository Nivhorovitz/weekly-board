-- Historical conversations stay open-ended until their host closes them.
alter table olive_house.os_talks add column starts_at timestamptz,
 add column ends_at timestamptz,
 add constraint os_window_valid check ((starts_at is null and ends_at is null) or
 (starts_at is not null and ends_at is not null and ends_at > starts_at));
create extension if not exists btree_gist with schema extensions;
set local search_path = pg_catalog, public, extensions;
alter table olive_house.os_talks add constraint os_no_overlap exclude using gist
 (room with =, desk with =, tstzrange(coalesce(starts_at, opened), ends_at, '[)') with &&) where (not closed);
drop index olive_house.os_desk_available;

create function public.os_house_schedule(device uuid, item uuid, room_id text, desk_name text, body text,
 display_name text, begins timestamptz, ends timestamptz, target uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare existing olive_house.os_talks;
begin
 body:=trim(body); display_name:=trim(display_name);
 if device is null or item is null or coalesce(length(body),0) not between 1 and 140
 or coalesce(length(display_name),0) not between 1 and 60 or begins is null or ends is null
 or not isfinite(begins) or not isfinite(ends) or ends <= now() or ends <= begins
 or ends-begins>interval '24 hours' or begins>now()+interval '2 years'
 or not exists(select from olive_house.os_rooms where room=room_id and desk_name=any(desks)) then
 raise exception 'invalid proposal'; end if;
 perform pg_advisory_xact_lock(hashtext('os_house_write'));
 select * into existing from olive_house.os_talks where id=item;
 if found then return existing.owner=device and existing.title=body and existing.room=room_id
 and existing.desk=desk_name and existing.starts_at=begins and existing.ends_at=ends; end if;
 if exists(select from olive_house.os_talks where owner=device and opened>now()-interval '3 seconds') then raise exception 'try later'; end if;
 insert into olive_house.os_talks(id,room,desk,title,host,owner,parent,starts_at,ends_at)
 values(item,room_id,desk_name,body,display_name,device,target,begins,ends);
 return true;
end $$;
revoke all on function public.os_house_schedule(uuid,uuid,text,text,text,text,timestamptz,timestamptz,uuid) from public;
grant execute on function public.os_house_schedule(uuid,uuid,text,text,text,text,timestamptz,timestamptz,uuid) to anon,authenticated;

-- Per-surface responses. Ordinary table notes are only included in the matching table view.
create function public.os_house_view(device uuid, room_id text default '', desk_name text default '')
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'rooms',coalesce((select jsonb_agg(to_jsonb(r) order by r.room) from olive_house.os_rooms r),'[]'),
 'talks',coalesce((select jsonb_agg((to_jsonb(t)-'owner')||jsonb_build_object('mine',t.owner=device) order by t.opened)
 from olive_house.os_talks t where desk_name='' or (t.room=room_id and t.desk=desk_name)),'[]'),
 'cards',coalesce((select jsonb_agg((to_jsonb(c)-'owner')||jsonb_build_object('mine',c.owner=device,
 'joined',exists(select from olive_house.os_members m where m.card=c.id and m.owner=device),
 'members',coalesce((select jsonb_agg(m.name order by m.name) from olive_house.os_members m where m.card=c.id),'[]')) order by c.posted)
 from olive_house.os_cards c join olive_house.os_talks t on t.id=c.talk
 where (desk_name='' and c.kind<>'note') or (desk_name<>'' and t.room=room_id and t.desk=desk_name)),'[]'))
$$;
revoke all on function public.os_house_view(uuid,text,text) from public;
grant execute on function public.os_house_view(uuid,text,text) to anon,authenticated;
