"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { leagueMeta, sportMeta } from "@/lib/catalog";
import { currentSubscription, delayedTest, enablePush, isStandalone, platform, pushHealth, pushSupported, sendTest } from "@/lib/client/push";
import TeamLogo from "@/components/TeamLogo";
import { pushParams } from "@/lib/client/useEvents";
import { playSound, setSoundsEnabled, soundsEnabled, type SoundKind } from "@/lib/client/sounds";

export default function SettingsPage() {
  const { t, lang, prefs, update } = useApp();
  const [notif, setNotif] = useState<"on" | "off" | "denied" | "unsupported">("off");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!pushSupported()) return setNotif("unsupported");
      if (Notification.permission === "denied") return setNotif("denied");
      setNotif((await currentSubscription()) ? "on" : "off");
    })();
  }, []);

  const activate = async () => {
    const r = await enablePush(lang, pushParams(prefs));
    if (r === "ok") setNotif("on");
    else if (r === "denied") setNotif("denied");
    else setMsg(t("dataError"));
  };

  // Se calcula en el teléfono (no en el servidor) para evitar diferencias al cargar.
  const [env, setEnv] = useState({ iosNotInstalled: false, standalone: true });
  useEffect(() => {
    setEnv({ iosNotInstalled: platform() === "ios" && !isStandalone(), standalone: isStandalone() });
  }, []);
  const iosNotInstalled = env.iosNotInstalled;

  return (
    <div className="pt-safe space-y-6 px-4 pb-4">
      <h1 className="pt-2 text-2xl font-extrabold tracking-tight">{t("tabSettings")}</h1>

      {!env.standalone && (
        <Link href="/install" className="flex items-center gap-3 rounded-2xl bg-brand px-4 py-4 font-extrabold text-white">
          <span className="text-2xl">📲</span> {t("install")}
        </Link>
      )}

      <Group title={t("mySports")}>
        <div className="space-y-3 p-4">
          {prefs.sports.map((s) => (
            <div key={s} className="flex items-center gap-2 font-bold" style={{ color: sportMeta(s).color }}>
              <span>{sportMeta(s).emoji}</span> {sportMeta(s).name[lang]}
            </div>
          ))}
          {prefs.leagues.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {prefs.leagues.map((l) => (
                <span key={l} className="rounded-full bg-card2 px-2.5 py-1 text-sm">
                  {leagueMeta(l)?.flag} {leagueMeta(l)?.name[lang]}
                </span>
              ))}
            </div>
          )}
          {prefs.teams.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {prefs.teams.map((tm) => (
                <span key={tm.id} className="flex items-center gap-1.5 rounded-full bg-card2 py-1 pr-2.5 pl-1 text-sm">
                  <TeamLogo src={tm.logo} name={tm.name} size={18} /> {tm.short ?? tm.name}
                </span>
              ))}
            </div>
          )}
          {(prefs.athletes ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(prefs.athletes ?? []).map((a) => (
                <span key={a.id} className="rounded-full bg-gold/15 px-2.5 py-1 text-sm text-gold">
                  👤 {a.name}
                </span>
              ))}
            </div>
          )}
          {(prefs.players ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {prefs.players.map((p) => (
                <span key={`${p.tour}:${p.id}`} className="rounded-full bg-card2 px-2.5 py-1 text-sm">
                  🎾 {p.name}
                </span>
              ))}
            </div>
          )}
          {prefs.drivers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {prefs.drivers.map((d) => (
                <span key={d.id} className="rounded-full bg-f1/15 px-2.5 py-1 text-sm">
                  🏎️ {d.name}
                </span>
              ))}
            </div>
          )}
          <Link href="/onboarding" className="block rounded-xl bg-brand py-3 text-center font-bold text-white">
            {t("edit")}
          </Link>
        </div>
      </Group>

      <Group title={t("notifications")}>
        <div className="space-y-3 p-4">
          {notif === "on" && (
            <>
              <p className="font-semibold text-football">✓ {t("notifOn")}</p>
              <PushDoctor />
              <button onClick={async () => setMsg((await sendTest()) ? "✓" : t("dataError"))} className="w-full rounded-xl bg-card2 py-3 font-semibold">
                {t("testNotif")}
              </button>
              <button
                onClick={() => update({ morning: prefs.morning === false })}
                className="flex w-full items-center justify-between rounded-xl bg-card2 px-4 py-3 text-left"
              >
                <span>
                  <span className="block font-semibold">☀️ {lang === "fr" ? "Résumé du matin (8 h)" : "Resumen matinal (8:00)"}</span>
                  <span className="block text-xs text-muted">{lang === "fr" ? "Les résultats d'hier et le programme du jour." : "Los resultados de ayer y lo que hay hoy."}</span>
                </span>
                <span className={`h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${prefs.morning !== false ? "bg-brand" : "bg-line"}`}>
                  <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${prefs.morning !== false ? "translate-x-5" : ""}`} />
                </span>
              </button>
            </>
          )}
          {notif === "off" &&
            (iosNotInstalled ? (
              <Link href="/install" className="block text-sm text-brand2">
                {t("notifNeedInstall")} →
              </Link>
            ) : (
              <button onClick={activate} className="w-full rounded-xl bg-brand py-3 font-bold text-white">
                {t("enableNotif")}
              </button>
            ))}
          {notif === "denied" && <p className="text-sm text-muted">{t("notifDenied")}</p>}
          {notif === "unsupported" && (
            <Link href="/install" className="block text-sm text-brand2">
              {t("notifNeedInstall")} →
            </Link>
          )}
          {msg && <p className="text-sm text-muted">{msg}</p>}
        </div>
      </Group>

      <Group title={lang === "fr" ? "Sons" : "Sonidos"}>
        <SoundSettings />
      </Group>

      <Group title={t("language")}>
        <Segmented
          value={prefs.lang ?? "auto"}
          options={[
            { v: "auto", label: t("phoneLang") },
            { v: "fr", label: "Français" },
            { v: "es", label: "Español" },
          ]}
          onChange={(v) => update({ lang: v === "auto" ? null : (v as "fr" | "es") })}
        />
      </Group>

      <Group title={t("theme")}>
        <Segmented
          value={prefs.theme}
          options={[
            { v: "dark", label: t("dark") },
            { v: "light", label: t("light") },
          ]}
          onChange={(v) => update({ theme: v as "dark" | "light" })}
        />
      </Group>


      <Group title={t("dataSources")}>
        <div className="space-y-2 p-4 text-sm text-muted">
          <p>{t("sourcesNote")}</p>
          <p>
            ESPN · Jolpica-F1 · ClubElo · Wikidata · football-data.org · Open-Meteo
          </p>
        </div>
      </Group>

      {process.env.NEXT_PUBLIC_REPORT_EMAIL && (
      <a
        href={`mailto:${process.env.NEXT_PUBLIC_REPORT_EMAIL}?subject=${encodeURIComponent("Opa's Score – " + t("reportError"))}`}
        className="block rounded-2xl bg-card px-4 py-4 text-center font-semibold"
      >
        ✉️ {t("reportError")}
      </a>
      )}

      <p className="pt-2 text-center text-xs text-muted">Opa&apos;s Score · Kriss &amp; Vale</p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold tracking-wider text-muted uppercase">{title}</h2>
      <div className="overflow-hidden rounded-2xl bg-card">{children}</div>
    </section>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 p-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${value === o.v ? "bg-text text-bg" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SoundSettings() {
  const { lang } = useApp();
  const fr = lang === "fr";
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(soundsEnabled());
  }, []);
  const tests: [SoundKind, string][] = [
    ["start", fr ? "🟢 Coup d'envoi" : "🟢 Pitazo inicial"],
    ["goal", fr ? "⚽ But" : "⚽ Gol"],
    ["yellow", fr ? "🟨 Carton jaune" : "🟨 Amarilla"],
    ["red", fr ? "🟥 Carton rouge" : "🟥 Roja"],
    ["penalty", fr ? "❌ Penalty" : "❌ Penal"],
    ["halftime", fr ? "⏸️ Mi-temps" : "⏸️ Entretiempo"],
    ["secondhalf", fr ? "▶️ Reprise" : "▶️ 2.º tiempo"],
    ["final", fr ? "🏁 Fin du match" : "🏁 Pitazo final"],
    ["lights", fr ? "🚦 Départ F1" : "🚦 Largada F1"],
    ["checkered", fr ? "🏆 Victoire F1" : "🏆 Ganador F1"],
    ["reminder", fr ? "🔔 Rappel" : "🔔 Aviso"],
  ];
  return (
    <div className="space-y-3 p-4">
      <button
        onClick={() => {
          setSoundsEnabled(!on);
          setOn(!on);
        }}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-semibold">{fr ? "Sons dans l'app (but, sifflet…)" : "Sonidos en la app (gol, silbato…)"}</span>
        <span className={`h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${on ? "bg-brand" : "bg-line"}`}>
          <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
        </span>
      </button>
      <div className="flex flex-wrap gap-2">
        {tests.map(([k, l]) => (
          <button key={k} onClick={() => playSound(k, true)} className="rounded-full bg-card2 px-3 py-1.5 text-sm font-semibold">
            {l}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted">
        {fr
          ? "Quand l'app est ouverte, chaque événement a son propre son. App fermée, le téléphone utilise sa sonnerie de notification (sur Android, chaque type vibre différemment)."
          : "Con la app abierta, cada evento tiene su propio sonido. Con la app cerrada, el teléfono usa su tono de notificación (en Android, cada tipo vibra distinto)."}
      </p>
    </div>
  );
}

// Diagnóstico de avisos: estado real y prueba con la app cerrada.
function PushDoctor() {
  const { lang } = useApp();
  const fr = lang === "fr";
  const [h, setH] = useState<{ registered: boolean; lastCron: string | null } | null | undefined>(undefined);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    pushHealth().then(setH);
  }, []);
  const ago = h?.lastCron ? Math.round((Date.now() - new Date(h.lastCron).getTime()) / 60000) : null;
  const serverOk = ago !== null && ago <= 3;
  const Line = ({ ok, text }: { ok: boolean | null; text: string }) => (
    <li className="flex items-start gap-2 text-sm">
      <span>{ok === null ? "…" : ok ? "✅" : "⚠️"}</span>
      <span className={ok === false ? "font-semibold text-live" : ""}>{text}</span>
    </li>
  );
  return (
    <div className="space-y-3 rounded-xl bg-card2 p-3">
      <ul className="space-y-1.5">
        <Line ok={h === undefined ? null : Boolean(h?.registered)} text={fr ? "Téléphone enregistré pour les notifications" : "Teléfono registrado para los avisos"} />
        <Line
          ok={h === undefined ? null : serverOk}
          text={
            ago === null
              ? fr
                ? "Contrôle du serveur : jamais exécuté"
                : "Control del servidor: nunca se ejecutó"
              : fr
                ? `Dernier contrôle du serveur : il y a ${ago} min`
                : `Último control del servidor: hace ${ago} min`
          }
        />
      </ul>
      <button
        disabled={sent}
        onClick={async () => setSent(await delayedTest())}
        className="w-full rounded-xl bg-brand py-3 font-bold text-white disabled:opacity-60"
      >
        {sent
          ? fr
            ? "Envoyé ! Ferme l'app : il arrive dans ~1 min"
            : "¡Listo! Cierra la app: llega en ~1 min"
          : fr
            ? "Tester avec l'app fermée"
            : "Probar con la app cerrada"}
      </button>
      {platform() === "android" && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">{fr ? "Si rien n'arrive (Android)" : "Si no llega nada (Android)"}</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
            <li>{fr ? "Paramètres → Applications → Chrome → Notifications : activées, avec son." : "Ajustes → Aplicaciones → Chrome → Notificaciones: activadas y con sonido."}</li>
            <li>{fr ? "Paramètres → Applications → Chrome → Batterie : « Non restreinte »." : "Ajustes → Aplicaciones → Chrome → Batería: «Sin restricciones»."}</li>
            <li>{fr ? "Fais pareil pour l'app « Opa's Score » si elle apparaît dans la liste." : "Haz lo mismo con la app «Opa's Score» si aparece en la lista."}</li>
            <li>{fr ? "Mode « Ne pas déranger » désactivé, ou Opa's Score autorisée." : "Modo «No molestar» apagado, o Opa's Score permitida."}</li>
          </ol>
        </details>
      )}
    </div>
  );
}
