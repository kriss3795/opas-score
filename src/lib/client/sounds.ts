"use client";

// Sonidos sintetizados en el teléfono (sin archivos externos): bocina de gol, silbato del árbitro, campanita.
export type SoundKind =
  | "goal"
  | "start"
  | "halftime"
  | "secondhalf"
  | "final"
  | "yellow"
  | "red"
  | "penalty"
  | "lights"
  | "checkered"
  | "reminder"
  | "morning"
  | "test";

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

function tone(c: AudioContext, t: number, freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol, t + dur - 0.03);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur);
}

// Redoble de tambor (ruido filtrado en golpes rápidos) para el penal.
function drumroll(c: AudioContext, t: number, dur: number) {
  const n = Math.floor(dur / 0.05);
  for (let i = 0; i < n; i++) {
    const len = Math.floor(c.sampleRate * 0.04);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 600;
    const g = c.createGain();
    g.gain.value = 0.15 + (0.25 * i) / n;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t + i * 0.05);
  }
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
    case "secondhalf":
      whistle(c, t, 0.6);
      break;
    case "yellow":
      // Silbato corto + tono de advertencia.
      whistle(c, t, 0.3);
      tone(c, t + 0.4, 660, 0.25, "triangle", 0.18);
      break;
    case "red":
      // Silbato largo + bronce grave descendente.
      whistle(c, t, 0.8);
      [196, 165, 131].forEach((f, i) => tone(c, t + 0.9 + i * 0.35, f, 0.45, "sawtooth", 0.09));
      break;
    case "penalty":
      whistle(c, t, 0.25);
      whistle(c, t + 0.35, 0.25);
      drumroll(c, t + 0.75, 1.4);
      break;
    case "lights":
      // Semáforos de F1: cinco pitidos y uno largo al apagarse.
      for (let i = 0; i < 5; i++) tone(c, t + i * 0.45, 880, 0.18, "square", 0.08);
      tone(c, t + 5 * 0.45 + 0.3, 1760, 0.6, "square", 0.08);
      break;
    case "checkered":
      // Fanfarria de victoria.
      [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.16, f, i === 3 ? 0.7 : 0.18, "triangle", 0.2));
      break;
    default:
      chime(c, t);
  }
}
