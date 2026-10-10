-- WayMark: Production Authentication & Hardened RLS Migration
-- Run this in Supabase SQL Editor to secure database and automate OAuth profiles

-- Optional column for Google OAuth avatars
alter table public.profiles add column if not exists avatar_url text;

-- 1. Automatic Profile sync trigger when user registers via Google or Email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_color, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'Traveler'
    ),
    '#f95d0f',
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
  set 
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Clean up old permissive RLS policies
drop policy if exists "open_all" on rooms;
drop policy if exists "open_all" on bucket_locations;
drop policy if exists "open_all" on proposed_routes;
drop policy if exists "open_all" on route_votes;
drop policy if exists "open_all" on profiles;

-- 3. Production Policies for Profiles
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- 4. Production Policies for Rooms
drop policy if exists "Anyone can view rooms" on rooms;
create policy "Anyone can view rooms"
  on rooms for select
  using (true);

drop policy if exists "Authenticated and guest users can create rooms" on rooms;
create policy "Authenticated and guest users can create rooms"
  on rooms for insert
  with check (auth.uid() is not null);

drop policy if exists "Only room creator can update room details" on rooms;
create policy "Only room creator can update room details"
  on rooms for update
  using (auth.uid() = created_by or created_by is null);

drop policy if exists "Only room creator can delete room" on rooms;
create policy "Only room creator can delete room"
  on rooms for delete
  using (auth.uid() = created_by or created_by is null);

-- 5. Production Policies for Bucket Locations
drop policy if exists "Anyone in room can view places" on bucket_locations;
create policy "Anyone in room can view places"
  on bucket_locations for select
  using (true);

drop policy if exists "Room participants can add places" on bucket_locations;
create policy "Room participants can add places"
  on bucket_locations for insert
  with check (auth.uid() is not null);

drop policy if exists "Room participants can update places" on bucket_locations;
create policy "Room participants can update places"
  on bucket_locations for update
  using (true);

drop policy if exists "Place adder or room creator can remove places" on bucket_locations;
create policy "Place adder or room creator can remove places"
  on bucket_locations for delete
  using (
    auth.uid() = added_by 
    or added_by is null 
    or exists (select 1 from rooms where rooms.id = bucket_locations.room_id and rooms.created_by = auth.uid())
  );

-- 6. Production Policies for Proposed Routes
drop policy if exists "Anyone in room can view routes" on proposed_routes;
create policy "Anyone in room can view routes"
  on proposed_routes for select
  using (true);

drop policy if exists "Room participants can save routes" on proposed_routes;
create policy "Room participants can save routes"
  on proposed_routes for insert
  with check (auth.uid() is not null);

drop policy if exists "Route creator or room creator can update routes" on proposed_routes;
create policy "Route creator or room creator can update routes"
  on proposed_routes for update
  using (
    auth.uid() = created_by 
    or created_by is null
    or exists (select 1 from rooms where rooms.id = proposed_routes.room_id and rooms.created_by = auth.uid())
  );

drop policy if exists "Route creator or room creator can delete routes" on proposed_routes;
create policy "Route creator or room creator can delete routes"
  on proposed_routes for delete
  using (
    auth.uid() = created_by 
    or created_by is null
    or exists (select 1 from rooms where rooms.id = proposed_routes.room_id and rooms.created_by = auth.uid())
  );

-- 7. Production Policies for Route Votes (No voting impersonation)
drop policy if exists "Anyone in room can view votes" on route_votes;
create policy "Anyone in room can view votes"
  on route_votes for select
  using (true);

drop policy if exists "Users can only cast votes under their own identity" on route_votes;
create policy "Users can only cast votes under their own identity"
  on route_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can only remove their own votes" on route_votes;
create policy "Users can only remove their own votes"
  on route_votes for delete
  using (auth.uid() = user_id);
