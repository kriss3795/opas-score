-- Opa's Score v3: alertas en vivo (goles, inicio, entretiempo, final) de los partidos seguidos.
alter table reminders add column if not exists league text;
alter table reminders add column if not exists last_state jsonb;
