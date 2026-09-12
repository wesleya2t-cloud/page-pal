-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  house text not null default 'inkfall',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)) || '-' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- BOOKS
create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  total_pages integer not null default 0,
  current_page integer not null default 0,
  status text not null default 'reading',
  notes text,
  cover_url text,
  recommended_by text,
  spine_color text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index books_user_idx on public.books(user_id);
grant select, insert, update, delete on public.books to authenticated;
grant all on public.books to service_role;
alter table public.books enable row level security;
create policy "books readable by authenticated" on public.books for select to authenticated using (true);
create policy "insert own books" on public.books for insert to authenticated with check (auth.uid() = user_id);
create policy "update own books" on public.books for update to authenticated using (auth.uid() = user_id);
create policy "delete own books" on public.books for delete to authenticated using (auth.uid() = user_id);

-- READING SESSIONS
create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  pages integer not null default 0,
  minutes integer not null default 0,
  note text,
  photo_url text,
  session_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);
create index reading_sessions_user_idx on public.reading_sessions(user_id, session_date desc);
grant select, insert, update, delete on public.reading_sessions to authenticated;
grant all on public.reading_sessions to service_role;
alter table public.reading_sessions enable row level security;
create policy "reading sessions readable by authenticated" on public.reading_sessions for select to authenticated using (true);
create policy "insert own reading sessions" on public.reading_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "update own reading sessions" on public.reading_sessions for update to authenticated using (auth.uid() = user_id);
create policy "delete own reading sessions" on public.reading_sessions for delete to authenticated using (auth.uid() = user_id);

-- STUDY SESSIONS
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  minutes integer not null default 0,
  notes text,
  session_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);
create index study_sessions_user_idx on public.study_sessions(user_id, session_date desc);
grant select, insert, update, delete on public.study_sessions to authenticated;
grant all on public.study_sessions to service_role;
alter table public.study_sessions enable row level security;
create policy "study sessions readable by authenticated" on public.study_sessions for select to authenticated using (true);
create policy "insert own study sessions" on public.study_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "update own study sessions" on public.study_sessions for update to authenticated using (auth.uid() = user_id);
create policy "delete own study sessions" on public.study_sessions for delete to authenticated using (auth.uid() = user_id);

-- FRIENDSHIPS
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);
grant select, insert, update, delete on public.friendships to authenticated;
grant all on public.friendships to service_role;
alter table public.friendships enable row level security;
create policy "see own friendships" on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "request friendship" on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id and requester_id <> addressee_id);
create policy "respond to friendship" on public.friendships for update to authenticated
  using (auth.uid() = addressee_id or auth.uid() = requester_id);
create policy "remove friendship" on public.friendships for delete to authenticated
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

-- RECOMMENDATIONS
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.recommendations to authenticated;
grant all on public.recommendations to service_role;
alter table public.recommendations enable row level security;
create policy "see own recommendations" on public.recommendations for select to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);
create policy "send recommendations" on public.recommendations for insert to authenticated
  with check (auth.uid() = from_user);
create policy "delete own recommendations" on public.recommendations for delete to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

-- KUDOS
create table public.kudos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  session_kind text not null default 'reading',
  created_at timestamptz not null default now(),
  unique (user_id, session_id)
);
grant select, insert, delete on public.kudos to authenticated;
grant all on public.kudos to service_role;
alter table public.kudos enable row level security;
create policy "kudos readable by authenticated" on public.kudos for select to authenticated using (true);
create policy "give own kudos" on public.kudos for insert to authenticated with check (auth.uid() = user_id);
create policy "remove own kudos" on public.kudos for delete to authenticated using (auth.uid() = user_id);
