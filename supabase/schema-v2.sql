-- Opa's Score v2: resumen matinal y liga de amigos. Pegar en Supabase > SQL Editor > Run.

alter table push_subs add column if not exists prefs jsonb;
alter table push_subs add column if not exists morning boolean default true;
alter table push_subs add column if not exists last_morning text;

create table if not exists fl_leagues (
  code text primary key,
  name text not null,
  comps text[] default '{}',
  f1 boolean default false,
  created_at timestamptz default now()
);

create table if not exists fl_members (
  id uuid primary key default gen_random_uuid(),
  league_code text not null references fl_leagues(code) on delete cascade,
  name text not null,
  token text unique not null,
  created_at timestamptz default now(),
  unique (league_code, name)
);

create table if not exists fl_preds (
  member_id uuid not null references fl_members(id) on delete cascade,
  event_key text not null,
  value jsonb not null,
  label text,
  start_at timestamptz,
  created_at timestamptz default now(),
  primary key (member_id, event_key)
);

alter table fl_leagues enable row level security;
alter table fl_members enable row level security;
alter table fl_preds enable row level security;

-- Apuestas con fichas virtuales (sin dinero real).
create table if not exists fl_bets (
  member_id uuid not null references fl_members(id) on delete cascade,
  event_key text not null,
  pick text not null check (pick in ('H','D','A')),
  stake integer not null check (stake > 0),
  odds numeric not null,
  label text,
  start_at timestamptz,
  created_at timestamptz default now(),
  primary key (member_id, event_key)
);
alter table fl_bets enable row level security;
