-- WanderRoom: Initial database schema
-- Run this in Supabase SQL Editor at Manual Break 2

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_color text default '#6366f1'
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table bucket_locations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  added_by uuid references profiles(id),
  place_id text not null,
  name text not null,
  address text,
  category text,
  lat double precision not null,
  lng double precision not null,
  rating numeric,
  review_count integer,
  is_mock_rating boolean default false,
  created_at timestamptz default now(),
  unique (room_id, place_id)
);

create table proposed_routes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  created_by uuid references profiles(id),
  route_name text,
  travel_mode text default 'DRIVE',
  waypoint_order jsonb not null,
  total_duration_mins integer,
  total_distance_m integer,
  encoded_polyline text,
  created_at timestamptz default now()
);

create table route_votes (
  route_id uuid references proposed_routes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (route_id, user_id)
);

-- Hackathon-grade RLS: open to any signed-in (including anonymous) user
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table bucket_locations enable row level security;
alter table proposed_routes enable row level security;
alter table route_votes enable row level security;

create policy open_all on profiles for all to anon, authenticated using (true) with check (true);
create policy open_all on rooms for all to anon, authenticated using (true) with check (true);
create policy open_all on bucket_locations for all to anon, authenticated using (true) with check (true);
create policy open_all on proposed_routes for all to anon, authenticated using (true) with check (true);
create policy open_all on route_votes for all to anon, authenticated using (true) with check (true);

-- Realtime: enable change tracking
alter table bucket_locations replica identity full;
alter table proposed_routes replica identity full;
alter table route_votes replica identity full;
alter publication supabase_realtime add table bucket_locations, proposed_routes, route_votes;
