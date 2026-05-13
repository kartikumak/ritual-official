# Rituals - Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text unique,
  avatar_url text,
  weekly_goal int default 140,
  total_rituals int default 0,
  settings jsonb default '{"reminders": true, "haptics": true}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DECKS
create table if not exists public.decks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  category text default 'General',
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ANCHORS
create table if not exists public.anchors (
  id uuid default uuid_generate_v4() primary key,
  deck_id uuid references public.decks(id) on delete cascade not null,
  word text not null,
  hint text,
  level text check (level in ('basic', 'intermediate', 'advanced')) default 'basic',
  keywords text[] not null,
  reference_answer text not null,
  concept_depth_max int default 5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ANCHOR PROGRESS (SRS STATE)
create table if not exists public.anchor_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  anchor_id uuid references public.anchors(id) on delete cascade not null,
  easiness_factor float default 2.5,
  interval_days int default 0,
  repetitions int default 0,
  concept_depth int default 0,
  due_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_score int,
  last_level text,
  total_reviews int default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, anchor_id)
);

-- REVIEW LOGS
create table if not exists public.review_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  anchor_id uuid references public.anchors(id) on delete cascade not null,
  session_id uuid,
  score int not null,
  recall_level text not null,
  response_text text,
  drawing_json text, -- New: stores the canvas path as JSON string
  audio_url text,    -- New: stores the link to recorded audio
  reviewed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SESSIONS
create table if not exists public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  deck_id uuid references public.decks(id) on delete cascade not null,
  total_count int,
  strong_count int,
  medium_count int,
  weak_count int,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone
);

-- CHAT MESSAGES
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RECALL ROOMS
create table if not exists public.recall_rooms (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  category text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROOM PARTICIPANTS
create table if not exists public.room_participants (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.recall_rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  is_muted boolean default false,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, user_id)
);

-- VOICE POSTS
create table if not exists public.voice_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  topic text not null,
  description text,
  audio_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration logic for existing tables
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'decks' and column_name = 'category') then
    alter table public.decks add column category text default 'General';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'total_rituals') then
    alter table public.profiles add column total_rituals int default 0;
  end if;
end
$$;

-- RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.anchors enable row level security;
alter table public.anchor_progress enable row level security;
alter table public.review_logs enable row level security;
alter table public.sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.recall_rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.voice_posts enable row level security;

-- Policies (Using DO blocks to avoid errors if they already exist)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can insert their own profile') then
    create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can view their own profile') then
    create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update their own profile') then
    create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Public profiles are viewable by everyone') then
    create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'decks' and policyname = 'Users can manage their own decks') then
    create policy "Users can manage their own decks" on public.decks for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'decks' and policyname = 'Public decks are viewable by everyone') then
    create policy "Public decks are viewable by everyone" on public.decks for select using (is_public = true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'anchors' and policyname = 'Users can manage anchors in their decks') then
    create policy "Users can manage anchors in their decks" on public.anchors for all using (
      exists (select 1 from public.decks where id = deck_id and user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'anchors' and policyname = 'Public anchors are viewable by everyone') then
    create policy "Public anchors are viewable by everyone" on public.anchors for select using (
      exists (select 1 from public.decks where id = deck_id and is_public = true)
    );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'anchor_progress' and policyname = 'Users can manage progress') then
    create policy "Users can manage progress" on public.anchor_progress for all using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'review_logs' and policyname = 'Users can manage their own logs') then
    create policy "Users can manage their own logs" on public.review_logs for all using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'sessions' and policyname = 'Users can manage sessions') then
    create policy "Users can manage sessions" on public.sessions for all using (auth.uid() = user_id);
  end if;

  -- Chat Messages
  if not exists (select 1 from pg_policies where tablename = 'chat_messages' and policyname = 'Anyone can view chat') then
    create policy "Anyone can view chat" on public.chat_messages for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'chat_messages' and policyname = 'Authenticated users can send messages') then
    create policy "Authenticated users can send messages" on public.chat_messages for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'chat_messages' and policyname = 'Users can delete their own messages') then
    create policy "Users can delete their own messages" on public.chat_messages for delete using (auth.uid() = user_id);
  end if;

  -- Recall Rooms
  if not exists (select 1 from pg_policies where tablename = 'recall_rooms' and policyname = 'Anyone can view active rooms') then
    create policy "Anyone can view active rooms" on public.recall_rooms for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recall_rooms' and policyname = 'Authenticated users can create rooms') then
    create policy "Authenticated users can create rooms" on public.recall_rooms for insert with check (auth.uid() = creator_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recall_rooms' and policyname = 'Creators can manage rooms') then
    create policy "Creators can manage rooms" on public.recall_rooms for all using (auth.uid() = creator_id);
  end if;

  -- Room Participants
  if not exists (select 1 from pg_policies where tablename = 'room_participants' and policyname = 'Anyone can view participants') then
    create policy "Anyone can view participants" on public.room_participants for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'room_participants' and policyname = 'Users can join rooms') then
    create policy "Users can join rooms" on public.room_participants for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'room_participants' and policyname = 'Users can manage their own participation') then
    create policy "Users can manage their own participation" on public.room_participants for all using (auth.uid() = user_id);
  end if;

  -- Voice Posts
  if not exists (select 1 from pg_policies where tablename = 'voice_posts' and policyname = 'Anyone can view voice posts') then
    create policy "Anyone can view voice posts" on public.voice_posts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'voice_posts' and policyname = 'Authenticated users can create voice posts') then
    create policy "Authenticated users can create voice posts" on public.voice_posts for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'voice_posts' and policyname = 'Users can delete their own voice posts') then
    create policy "Users can delete their own voice posts" on public.voice_posts for delete using (auth.uid() = user_id);
  end if;
end
$$;

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
