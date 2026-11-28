create table olive_house.os_rooms (
  room text primary key, label text not null, desks text[] not null
);
insert into olive_house.os_rooms values
('SiP9e8gVkEFw6zkqYuDW','מרחב פתוח',array['זית','גפן','חצר','כרם','שולחן לארבעה']);
create table olive_house.os_talks (
  id uuid primary key, room text references olive_house.os_rooms not null,
  desk text not null, title text not null, host text not null, owner uuid not null,
  parent uuid references olive_house.os_talks, opened timestamptz not null default now(), closed boolean not null default false
);
create unique index os_desk_available on olive_house.os_talks(room,desk) where not closed;
create table olive_house.os_cards (
  id uuid primary key, talk uuid not null references olive_house.os_talks, kind text not null,
  body text not null, invitation text not null, host text not null, owner uuid not null, posted timestamptz not null default now()
);
create table olive_house.os_members (
  card uuid references olive_house.os_cards, owner uuid not null, name text not null, primary key(card,owner)
);
alter table olive_house.os_rooms enable row level security;
alter table olive_house.os_talks enable row level security;
alter table olive_house.os_cards enable row level security;
alter table olive_house.os_members enable row level security;
revoke all on olive_house.os_rooms,olive_house.os_talks,olive_house.os_cards,olive_house.os_members from public, anon,authenticated;
create function public.os_house_board(device uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'rooms',(select jsonb_agg(to_jsonb(r)) from olive_house.os_rooms r),
 'talks',coalesce((select jsonb_agg((to_jsonb(t)-'owner')||jsonb_build_object('mine',t.owner=device) order by t.opened) from olive_house.os_talks t),'[]'),
 'cards',coalesce((select jsonb_agg((to_jsonb(c)-'owner')||jsonb_build_object('mine',c.owner=device,
 'joined',exists(select from olive_house.os_members m where m.card=c.id and m.owner=device),
 'members',coalesce((select jsonb_agg(m.name order by m.name) from olive_house.os_members m where m.card=c.id),'[]')) order by c.posted)
 from olive_house.os_cards c),'[]'))
$$;
create function public.os_house_write(device uuid, op text, item uuid, target uuid default null, room_id text default '', desk_name text default '', body text default '', invitation text default '', display_name text default '') returns boolean language plpgsql security definer set search_path='' as $$
declare conversation olive_house.os_talks; old_card olive_house.os_cards;
begin
 if device is null or item is null then raise exception 'missing identity'; end if;
 body:=trim(coalesce(body,'')); invitation:=trim(coalesce(invitation,'')); display_name:=trim(coalesce(display_name,''));
 if length(body)>400 or length(invitation)>240 or length(display_name)>60 then raise exception 'too long'; end if;
 perform pg_advisory_xact_lock(hashtext('os_house_write'));
 if op in ('join','leave') then
   if not exists(select from olive_house.os_cards where id=item and kind='initiative') then raise exception 'missing initiative'; end if;
   if op='leave' then delete from olive_house.os_members where card=item and owner=device;
   else
     if display_name='' then raise exception 'missing name'; end if;
     insert into olive_house.os_members values(item,device,display_name) on conflict(card,owner) do update set name=excluded.name;
   end if;
   return true;
 end if;
 if op='close' then
   update olive_house.os_talks set closed=true where id=item and owner=device; return found;
 end if;
 if op='talk' then
   select * into conversation from olive_house.os_talks where id=item;
   if found then return conversation.owner=device and conversation.title=body; end if;
   if body='' or length(body)>140 or display_name='' or not exists(select from olive_house.os_rooms where room=room_id and desk_name=any(desks)) then raise exception 'invalid topic'; end if;
   if exists(select from olive_house.os_talks where owner=device and opened>now()-interval '3 seconds') then raise exception 'try later'; end if;
   insert into olive_house.os_talks(id,room,desk,title,host,owner,parent) values(item,room_id,desk_name,body,display_name,device,target); return true;
 end if;
 if op not in ('note','harvest','initiative') or op is null or body='' then raise exception 'invalid contribution'; end if;
 select * into old_card from olive_house.os_cards where id=item;
 if found then return old_card.owner=device and old_card.talk=target and old_card.kind=op and old_card.body=body; end if;
 if not exists(select from olive_house.os_talks where id=target and not closed) then raise exception 'conversation closed'; end if;
 if op='initiative' and (display_name='' or invitation='') then raise exception 'incomplete invitation'; end if;
 if (select count(*) from olive_house.os_cards where posted>now()-interval '1 minute')>=120 then raise exception 'try later'; end if;
 insert into olive_house.os_cards(id,talk,kind,body,invitation,host,owner) values(item,target,op,body,invitation,display_name,device);
 return true;
end $$;
revoke all on function public.os_house_board(uuid),public.os_house_write(uuid,text,uuid,uuid,text,text,text,text,text) from public;
grant execute on function public.os_house_board(uuid),public.os_house_write(uuid,text,uuid,uuid,text,text,text,text,text) to anon,authenticated;
