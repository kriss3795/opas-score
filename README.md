# Opa's Score

App deportiva personal (PWA) en francés y español: fútbol y Fórmula 1 con datos reales.

- Next.js + TypeScript + Tailwind, alojada en Vercel (plan gratuito).
- Datos: ESPN (marcadores, calendario, tablas), football-data.org (respaldo de tablas),
  Jolpica-F1 (calendario, campeonatos, resultados), ESPN (tiempos F1 en vivo), Open-Meteo (clima).
- Notificaciones: Web Push + Supabase + cron-job.org (cada minuto llama a `/api/cron/notify`).

## Configuración

1. Supabase > SQL Editor: pegar y ejecutar `supabase/schema.sql`.
2. Vercel > Project > Settings > Environment Variables: copiar las de `.env.example`.
3. cron-job.org: nueva tarea cada minuto a `https://TU-DOMINIO/api/cron/notify?key=CRON_SECRET`.

## Agregar un deporte

Añadir su entrada en `src/lib/catalog.ts`, su adaptador en `src/lib/server/` y su ruta en `src/app/api/`.
