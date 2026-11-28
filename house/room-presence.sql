alter table olive_house.os_rooms add column seen_at timestamptz;
update olive_house.os_rooms set desks=array_replace(desks,'שולחן לארבעה','הבוסתן');
-- Public, short-lived routing hints contributed by embedded copies. This grants no room access.
create function public.os_house_presence(room_id text, room_label text) returns boolean
language plpgsql security definer set search_path='' as $$
declare r olive_house.os_rooms; template text:='SiP9e8gVkEFw6zkqYuDW';
begin
 if room_id=template then return true; end if;
 if room_id is null or room_label is null or room_id !~ '^[A-Za-z0-9]{20}$' or room_label !~ '^מרחב פתוח #[1-9][0-9]{0,2}$' then return false;end if;
 perform pg_advisory_xact_lock(hashtext('os_house_room_presence'));
 select * into r from olive_house.os_rooms where room=room_id;
 if found then
   if r.label<>room_label then return false;end if;
   if r.seen_at<now()-interval '25 seconds' then update olive_house.os_rooms set seen_at=now() where room=room_id;end if;
   return true;
 end if;
 if exists(select from olive_house.os_rooms where label=room_label and seen_at>now()-interval '80 seconds') then return false;end if;
 if (select count(*) from olive_house.os_rooms where seen_at>now()-interval '1 hour')>=200 then return false;end if;
 insert into olive_house.os_rooms(room,label,desks,seen_at) select room_id,room_label,desks,now() from olive_house.os_rooms where room=template;
 return found;
end $$;
revoke all on function public.os_house_presence(text,text) from public;
grant execute on function public.os_house_presence(text,text) to anon,authenticated;
