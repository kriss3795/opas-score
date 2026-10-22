import "server-only";
import { getJson } from "./http";

// Open-Meteo: gratis, sin clave. Pronóstico hasta 16 días.
export interface DayWeather {
  date: string;
  code: number;
  tMax: number;
  tMin: number;
  rain: number | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function circuitWeather(lat: number, lon: number, from: string, to: string): Promise<DayWeather[] | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&start_date=${from}&end_date=${to}`;
  const d = await getJson<any>(url, 3600);
  if (!d?.daily?.time) return null;
  return d.daily.time.map((date: string, i: number) => ({
    date,
    code: d.daily.weather_code?.[i],
    tMax: d.daily.temperature_2m_max?.[i],
    tMin: d.daily.temperature_2m_min?.[i],
    rain: d.daily.precipitation_probability_max?.[i] ?? null,
  }));
}
