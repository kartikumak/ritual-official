# Rituals - Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text unique,
  avatar_url text,
  weekly_goal int default 140,
  settings jsonb default '{"reminders": true, "haptics": true}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DECKS
create table public.decks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ANCHORS
create table public.anchors (
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
create table public.anchor_progress (
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
create table public.review_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  anchor_id uuid references public.anchors(id) on delete cascade not null,
  session_id uuid,
  score int not null,
  recall_level text not null,
  response_text text,
  had_drawing boolean default false,
  reviewed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SESSIONS
create table public.sessions (
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

-- RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.anchors enable row level security;
alter table public.anchor_progress enable row level security;
alter table public.review_logs enable row level security;
alter table public.sessions enable row level security;

-- Policies
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
create policy "Users can manage their own decks" on decks for all using (auth.uid() = user_id);
create policy "Users can view anchors in their decks" on anchors for select using (
  exists (select 1 from decks where id = deck_id and user_id = auth.uid())
);
create policy "Users can manage progress" on anchor_progress for all using (auth.uid() = user_id);
create policy "Users can view their logs" on review_logs for select using (auth.uid() = user_id);

-- Create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
