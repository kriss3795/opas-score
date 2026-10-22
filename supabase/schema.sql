-- Opa's Score: pegar esto en Supabase > SQL Editor > New query > Run

create table if not exists push_subs (
  endpoint text primary key,
  sub jsonb not null,
  lang text default 'fr',
  tz text,
  created_at timestamptz default now()
);

create table if not exists reminders (
  id bigserial primary key,
  endpoint text not null references push_subs(endpoint) on delete cascade,
  event_id text not null,
  title text,
  body text,
  url text,
  start_at timestamptz not null,
  sent boolean default false,
  unique (endpoint, event_id)
);

create index if not exists reminders_due on reminders (sent, start_at);

-- Solo el servidor (clave service_role) puede leer y escribir.
alter table push_subs enable row level security;
alter table reminders enable row level security;
