create table if not exists public.rooms (
  code text primary key,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting',
  ban_count smallint not null default 2,
  pick_count smallint not null default 4,
  immunity_count smallint not null default 0,
  turn_timer_seconds integer not null default 120,
  draft_mode text not null default 'single_roster',
  draft_state jsonb not null default '{"target_user_id":null,"turn_started_at":null,"ready_user_ids":[],"immunities":[],"bans":[],"picks":[]}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.rooms
  add column if not exists ban_count smallint not null default 2,
  add column if not exists pick_count smallint not null default 4,
  add column if not exists immunity_count smallint not null default 0,
  add column if not exists turn_timer_seconds integer not null default 120,
  add column if not exists draft_mode text not null default 'single_roster',
  add column if not exists draft_state jsonb not null default '{"target_user_id":null,"turn_started_at":null,"ready_user_ids":[],"immunities":[],"bans":[],"picks":[]}'::jsonb;

update public.rooms
set ban_count = 2
where ban_count is null or ban_count < 1 or ban_count > 4;

update public.rooms
set pick_count = 4
where pick_count is null or pick_count < 2 or pick_count > 8;

update public.rooms
set immunity_count = 0
where immunity_count is null or immunity_count < 0 or immunity_count > 2;

update public.rooms
set turn_timer_seconds = 120
where turn_timer_seconds is null or turn_timer_seconds not in (0, 60, 120, 180, 240, 300);

update public.rooms
set draft_mode = 'single_roster'
where draft_mode is null or draft_mode not in ('single_roster', 'dual_roster');

update public.rooms
set immunity_count = 2
where draft_mode = 'dual_roster';

update public.rooms
set draft_state = '{"target_user_id":null,"turn_started_at":null,"ready_user_ids":[],"immunities":[],"bans":[],"picks":[]}'::jsonb
where draft_state is null;

update public.rooms
set draft_state = jsonb_set(draft_state, '{immunities}', '[]'::jsonb, true)
where not (draft_state ? 'immunities');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_ban_count_range'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_ban_count_range check (ban_count between 1 and 4);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_immunity_count_range'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_immunity_count_range check (immunity_count between 0 and 2);
  end if;
end $$;

create or replace function public.delete_room_if_empty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.room_players rp
    where rp.room_code = old.room_code
  ) then
    delete from public.rooms r
    where r.code = old.room_code;
  end if;

  return old;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'room_players_delete_room_if_empty'
      and tgrelid = 'public.room_players'::regclass
  ) then
    create trigger room_players_delete_room_if_empty
      after delete on public.room_players
      for each row
      execute function public.delete_room_if_empty();
  end if;
end $$;

create or replace function public.cleanup_stale_rooms(max_age_minutes integer default 180)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  effective_max_age_minutes integer := greatest(coalesce(max_age_minutes, 180), 30);
begin
  delete from public.rooms r
  where r.created_at < now() - make_interval(mins => effective_max_age_minutes);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_stale_rooms(integer) to authenticated;

do $$
begin
  if to_regclass('public.user_characters') is not null then
    alter table public.user_characters enable row level security;
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_characters') is not null
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'user_characters'
        and policyname = 'user_characters_authenticated_select_all'
    )
  then
    create policy user_characters_authenticated_select_all
      on public.user_characters
      for select
      to authenticated
      using (true);
  end if;
end $$;

-- Hard reset of user_characters policies to avoid conflicts with old/broken RLS rules.
do $$
declare
  p record;
begin
  if to_regclass('public.user_characters') is null then
    return;
  end if;

  alter table public.user_characters enable row level security;

  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_characters'
  loop
    execute format('drop policy if exists %I on public.user_characters', p.policyname);
  end loop;

  create policy user_characters_select_authenticated
    on public.user_characters
    for select
    to authenticated
    using (true);

  create policy user_characters_insert_own
    on public.user_characters
    for insert
    to authenticated
    with check (auth.uid() = user_id);

  create policy user_characters_update_own
    on public.user_characters
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create policy user_characters_delete_own
    on public.user_characters
    for delete
    to authenticated
    using (auth.uid() = user_id);
end $$;

do $$
begin
  if to_regclass('public.user_characters') is not null
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'user_characters'
        and policyname = 'user_characters_authenticated_insert_own'
    )
  then
    create policy user_characters_authenticated_insert_own
      on public.user_characters
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_characters') is not null
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'user_characters'
        and policyname = 'user_characters_authenticated_update_own'
    )
  then
    create policy user_characters_authenticated_update_own
      on public.user_characters
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_characters') is not null
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'user_characters'
        and policyname = 'user_characters_authenticated_delete_own'
    )
  then
    create policy user_characters_authenticated_delete_own
      on public.user_characters
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_draft_mode_allowed'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_draft_mode_allowed check (draft_mode in ('single_roster', 'dual_roster'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_pick_count_range'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_pick_count_range check (pick_count between 2 and 8);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_turn_timer_seconds_allowed'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_turn_timer_seconds_allowed check (turn_timer_seconds in (0, 60, 120, 180, 240, 300));
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(trim(nickname)) between 3 and 24)
);

create table if not exists public.room_players (
  room_code text not null references public.rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'guest',
  created_at timestamptz not null default now(),
  primary key (room_code, user_id)
);

do $$
begin
  if to_regclass('public.user_characters') is not null then
    alter table public.user_characters
      add column if not exists constellation smallint not null default 0;

    update public.user_characters
    set constellation = 0
    where constellation is null or constellation < 0 or constellation > 6;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'user_characters_constellation_range'
        and conrelid = 'public.user_characters'::regclass
    ) then
      alter table public.user_characters
        add constraint user_characters_constellation_range check (constellation between 0 and 6);
    end if;
  end if;
end $$;

alter table public.room_players
  add column if not exists display_name text;

update public.room_players rp
set display_name = coalesce(nullif(rp.display_name, ''), split_part(au.email, '@', 1), left(rp.user_id::text, 8))
from auth.users au
where au.id = rp.user_id
  and (rp.display_name is null or rp.display_name = '');

update public.room_players rp
set display_name = p.nickname
from public.profiles p
where p.id = rp.user_id
  and (rp.display_name is null or rp.display_name = '' or rp.display_name = left(rp.user_id::text, 8));

update public.room_players
set display_name = left(user_id::text, 8)
where display_name is null or display_name = '';

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_authenticated_select'
  ) then
    create policy profiles_authenticated_select
      on public.profiles
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_anon_select'
  ) then
    create policy profiles_anon_select
      on public.profiles
      for select
      to anon
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rooms'
      and policyname = 'rooms_authenticated_all'
  ) then
    create policy rooms_authenticated_all
      on public.rooms
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'room_players'
      and policyname = 'room_players_authenticated_all'
  ) then
    create policy room_players_authenticated_all
      on public.room_players
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
