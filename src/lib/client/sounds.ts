"use client";

// Sonidos sintetizados en el teléfono (sin archivos externos): bocina de gol, silbato del árbitro, campanita.
export type SoundKind = "goal" | "start" | "halftime" | "final" | "reminder" | "morning" | "test";

let ctx: AudioContext | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
  return ctx;
}

// Los navegadores solo permiten sonido después de un toque del usuario: se "desbloquea" al primer toque.
export function unlockAudio() {
  const c = ac();
  if (!c) return;
  const b = c.createBuffer(1, 1, 22050);
  const s = c.createBufferSource();
  s.buffer = b;
  s.connect(c.destination);
  s.start(0);
}

export function soundsEnabled() {
  try {
    return localStorage.getItem("opas-sounds") !== "off";
  } catch {
    return true;
  }
}
export function setSoundsEnabled(on: boolean) {
  try {
    localStorage.setItem("opas-sounds", on ? "on" : "off");
  } catch {
    /* sin almacenamiento */
  }
}

function whistle(c: AudioContext, t: number, dur: number) {
  const o = c.createOscillator();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = 2900;
  lfo.frequency.value = 28;
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain).connect(o.frequency);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.02);
  g.gain.setValueAtTime(0.25, t + dur - 0.04);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur);
  lfo.stop(t + dur);
}

function crowd(c: AudioContext, t: number, dur: number) {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 900;
  f.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.35, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.01, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

function horn(c: AudioContext, t: number, dur: number) {
  [233, 294, 349].forEach((fq) => {
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.value = fq;
    f.type = "lowpass";
    f.frequency.value = 1400;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.08);
    g.gain.setValueAtTime(0.09, t + dur - 0.15);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f).connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur);
  });
}

function chime(c: AudioContext, t: number) {
  [880, 1318.5].forEach((fq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = fq;
    const s = t + i * 0.18;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.25, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.9);
    o.connect(g).connect(c.destination);
    o.start(s);
    o.stop(s + 1);
  });
}

export function playSound(kind: SoundKind, force = false) {
  if (!force && !soundsEnabled()) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + 0.05;
  switch (kind) {
    case "goal":
      horn(c, t, 0.9);
      horn(c, t + 1.0, 1.3);
      crowd(c, t, 3.2);
      break;
    case "start":
      whistle(c, t, 0.9);
      break;
    case "halftime":
      whistle(c, t, 0.35);
      whistle(c, t + 0.5, 0.35);
      break;
    case "final":
      whistle(c, t, 0.35);
      whistle(c, t + 0.5, 0.35);
      whistle(c, t + 1.0, 1.0);
      break;
    default:
      chime(c, t);
  }
}
