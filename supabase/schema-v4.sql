-- Opa's Score v4: ligas con temporada (inicio, fin, jornadas semanales) y resultados guardados.
alter table fl_leagues add column if not exists starts_at timestamptz default now();
alter table fl_leagues add column if not exists ends_at timestamptz;

create table if not exists fl_results (
  event_key text primary key,
  value jsonb not null,
  created_at timestamptz default now()
);
alter table fl_results enable row level security;
