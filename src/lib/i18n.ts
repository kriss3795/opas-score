export type Lang = "fr" | "es";

const dict = {
  appName: { fr: "Opa's Score", es: "Opa's Score" },
  welcome: {
    fr: "Pour toi, Richy, une app pensée pour le meilleur des grands-pères…",
    es: "Para ti, Richy, una app pensada en el mejor abuelo…",
  },
  welcomeSign: {
    fr: "Avec toute notre affection, Kriss et Vale (et bientôt Falco).",
    es: "Con todo nuestro cariño, Kriss y Vale (y pronto Falco).",
  },
  start: { fr: "Commencer", es: "Comenzar" },
  next: { fr: "Suivant", es: "Siguiente" },
  back: { fr: "Retour", es: "Volver" },
  done: { fr: "C'est parti !", es: "¡Listo!" },
  chooseSports: { fr: "Quels sports suis-tu ?", es: "¿Qué deportes sigues?" },
  chooseSportsSub: { fr: "Tu pourras changer ça à tout moment.", es: "Puedes cambiarlo cuando quieras." },
  chooseLeagues: { fr: "Tes compétitions", es: "Tus competiciones" },
  chooseLeaguesSub: { fr: "Les compétitions que tu veux suivre en entier.", es: "Las competiciones que quieres seguir completas." },
  chooseTeams: { fr: "Tes équipes", es: "Tus equipos" },
  chooseTeamsSub: { fr: "Cherche tes clubs et sélections préférés.", es: "Busca tus clubes y selecciones favoritos." },
  chooseDrivers: { fr: "Tes pilotes", es: "Tus pilotos" },
  chooseDriversSub: { fr: "Tes pilotes préférés seront mis en avant.", es: "Tus pilotos favoritos aparecerán destacados." },
  choosePlayers: { fr: "Tes joueurs de tennis", es: "Tus tenistas" },
  choosePlayersSub: { fr: "Tu verras tous leurs matchs.", es: "Verás todos sus partidos." },
  searchPlayer: { fr: "Rechercher un joueur ou une joueuse…", es: "Buscar un jugador o jugadora…" },
  americas: { fr: "Amériques", es: "Américas" },
  women: { fr: "Football féminin", es: "Fútbol femenino" },
  eventsOf: { fr: "Événements", es: "Eventos" },
  leaderboard: { fr: "Classement", es: "Clasificación" },
  fightCard: { fr: "Carte des combats", es: "Cartelera" },
  installShort: { fr: "Installer", es: "Instalar" },
  installCta: { fr: "Installe l'app sur ton téléphone", es: "Instala la app en tu teléfono" },
  installCtaSub: { fr: "Comme une vraie app, avec les notifications.", es: "Como una app de verdad, con notificaciones." },
  searchTeam: { fr: "Rechercher une équipe…", es: "Buscar un equipo…" },
  searchDriver: { fr: "Rechercher un pilote…", es: "Buscar un piloto…" },
  noResult: { fr: "Aucun résultat", es: "Sin resultados" },
  selected: { fr: "Sélectionnés", es: "Seleccionados" },
  tabProgramme: { fr: "Programme", es: "Programa" },
  tabTables: { fr: "Classements", es: "Tablas" },
  tabGP: { fr: "Grand Prix", es: "Gran Premio" },
  tabSettings: { fr: "Réglages", es: "Ajustes" },
  myProgramme: { fr: "Mon programme", es: "Mi programa" },
  live: { fr: "En direct", es: "En vivo" },
  followed: { fr: "Mes matchs suivis", es: "Mis partidos seguidos" },
  today: { fr: "Aujourd'hui", es: "Hoy" },
  tomorrow: { fr: "Demain", es: "Mañana" },
  yesterday: { fr: "Hier", es: "Ayer" },
  upcoming: { fr: "À venir", es: "Próximamente" },
  recent: { fr: "Résultats récents", es: "Resultados recientes" },
  nothing: {
    fr: "Rien de prévu pour tes favoris ces prochains jours.",
    es: "No hay nada programado para tus favoritos en los próximos días.",
  },
  dataError: {
    fr: "Données momentanément indisponibles. Nouvel essai automatique.",
    es: "Datos no disponibles por el momento. Se reintentará automáticamente.",
  },
  final: { fr: "Terminé", es: "Final" },
  halftime: { fr: "Mi-temps", es: "Entretiempo" },
  postponed: { fr: "Reporté", es: "Aplazado" },
  remind: { fr: "Suivre : rappel 15 min avant, buts et résultat", es: "Seguir: aviso 15 min antes, goles y resultado" },
  reminded: { fr: "Rappel activé", es: "Aviso activado" },
  tv: { fr: "TV", es: "TV" },
  source: { fr: "Source", es: "Fuente" },
  sessions: { fr: "Programme du week-end", es: "Horarios del fin de semana" },
  weather: { fr: "Météo sur le circuit", es: "Clima en el circuito" },
  driversStandings: { fr: "Classement pilotes", es: "Campeonato de pilotos" },
  teamsStandings: { fr: "Classement constructeurs", es: "Campeonato de constructores" },
  lastRace: { fr: "Dernière course", es: "Última carrera" },
  liveTiming: { fr: "Classement en direct", es: "Clasificación en vivo" },
  titleCalc: { fr: "Qui peut encore être champion ?", es: "¿Quién puede ser campeón todavía?" },
  titleCalcExplain: {
    fr: "Calcul : points restants possibles (course + sprint) comparés à l'écart avec le leader.",
    es: "Cálculo: puntos posibles que quedan (carrera + sprint) comparados con la distancia al líder.",
  },
  stillPossible: { fr: "encore possible", es: "todavía posible" },
  eliminated: { fr: "éliminé", es: "eliminado" },
  leader: { fr: "leader", es: "líder" },
  pointsLeft: { fr: "points encore en jeu", es: "puntos todavía en juego" },
  pts: { fr: "pts", es: "pts" },
  seasonOver: {
    fr: "La saison est terminée. Le calendrier de la prochaine saison apparaîtra dès sa publication.",
    es: "La temporada terminó. El calendario de la próxima aparecerá apenas se publique.",
  },
  noF1: {
    fr: "Ajoute la Formule 1 dans Réglages pour voir le mode Grand Prix.",
    es: "Agrega la Fórmula 1 en Ajustes para ver el modo Gran Premio.",
  },
  round: { fr: "Manche", es: "Fecha" },
  played: { fr: "J", es: "PJ" },
  diff: { fr: "Diff", es: "Dif" },
  points: { fr: "Pts", es: "Pts" },
  noTable: { fr: "Pas de classement disponible pour cette compétition.", es: "No hay tabla disponible para esta competición." },
  stats: { fr: "Statistiques", es: "Estadísticas" },
  events: { fr: "Faits de match", es: "Incidencias" },
  h2h: { fr: "Derniers face-à-face", es: "Últimos enfrentamientos" },
  venue: { fr: "Stade", es: "Estadio" },
  language: { fr: "Langue", es: "Idioma" },
  phoneLang: { fr: "Langue du téléphone", es: "Idioma del teléfono" },
  theme: { fr: "Apparence", es: "Apariencia" },
  dark: { fr: "Sombre", es: "Oscuro" },
  light: { fr: "Clair", es: "Claro" },
  mySports: { fr: "Mes sports et favoris", es: "Mis deportes y favoritos" },
  edit: { fr: "Modifier", es: "Editar" },
  notifications: { fr: "Notifications", es: "Notificaciones" },
  enableNotif: { fr: "Activer les notifications", es: "Activar notificaciones" },
  notifOn: { fr: "Notifications activées", es: "Notificaciones activadas" },
  notifDenied: {
    fr: "Notifications bloquées. Autorise-les dans les réglages du téléphone.",
    es: "Notificaciones bloqueadas. Autorízalas en los ajustes del teléfono.",
  },
  notifNeedInstall: {
    fr: "Sur iPhone, ajoute d'abord l'app à l'écran d'accueil pour recevoir les notifications.",
    es: "En iPhone, primero agrega la app a la pantalla de inicio para recibir notificaciones.",
  },
  testNotif: { fr: "Envoyer une notification test", es: "Enviar notificación de prueba" },
  install: { fr: "Installer l'app", es: "Instalar la app" },
  installTitle: { fr: "Ajoute Opa's Score à ton écran d'accueil", es: "Agrega Opa's Score a tu pantalla de inicio" },
  installedOk: { fr: "L'app est installée. Parfait !", es: "La app está instalada. ¡Perfecto!" },
  iosStep1: { fr: "Ouvre cette page dans Safari.", es: "Abre esta página en Safari." },
  iosStep2: { fr: "Touche le bouton Partager (carré avec une flèche vers le haut).", es: "Toca el botón Compartir (cuadrado con una flecha hacia arriba)." },
  iosStep3: { fr: "Choisis « Sur l'écran d'accueil ».", es: "Elige «Agregar a pantalla de inicio»." },
  iosStep4: { fr: "Touche « Ajouter », puis ouvre l'app depuis l'icône.", es: "Toca «Agregar» y luego abre la app desde el ícono." },
  iosVersion: { fr: "Notifications : iOS 16.4 ou plus récent requis.", es: "Notificaciones: se necesita iOS 16.4 o más reciente." },
  andStep1: { fr: "Ouvre cette page dans Chrome.", es: "Abre esta página en Chrome." },
  andStep2: { fr: "Touche le bouton ci-dessous, ou le menu ⋮ puis « Installer l'application ».", es: "Toca el botón de abajo, o el menú ⋮ y luego «Instalar aplicación»." },
  andStep3: { fr: "Confirme, puis ouvre l'app depuis l'icône.", es: "Confirma y luego abre la app desde el ícono." },
  installNow: { fr: "Installer maintenant", es: "Instalar ahora" },
  desktop: {
    fr: "Ouvre ce lien sur ton téléphone pour installer l'app.",
    es: "Abre este enlace en tu teléfono para instalar la app.",
  },
  later: { fr: "Plus tard", es: "Más tarde" },
  reportError: { fr: "Signaler une erreur", es: "Reportar un error" },
  dataSources: { fr: "Sources des données", es: "Fuentes de datos" },
  sourcesNote: {
    fr: "Toutes les données viennent de sources publiques. Rien n'est inventé : si une donnée manque, l'app ne l'affiche pas.",
    es: "Todos los datos vienen de fuentes públicas. Nada es inventado: si falta un dato, la app no lo muestra.",
  },
  forecastFor: { fr: "Prévisions", es: "Pronóstico" },
  rainChance: { fr: "pluie", es: "lluvia" },
  practice: { fr: "Essais libres", es: "Práctica libre" },
  qualifying: { fr: "Qualifications", es: "Clasificación" },
  sprint: { fr: "Sprint", es: "Sprint" },
  sprintQuali: { fr: "Qualifs sprint", es: "Clasificación sprint" },
  race: { fr: "Course", es: "Carrera" },
  updatedAfter: {
    fr: "Classement en direct pendant la session ; résultats officiels peu après.",
    es: "Clasificación en vivo durante la sesión; resultados oficiales poco después.",
  },
  allLeagues: { fr: "Toutes les compétitions", es: "Todas las competiciones" },
  france: { fr: "France", es: "Francia" },
  europe: { fr: "Europe", es: "Europa" },
  intl: { fr: "Sélections", es: "Selecciones" },
  world: { fr: "Reste du monde", es: "Resto del mundo" },
  favorites: { fr: "Favoris", es: "Favoritos" },
  loading: { fr: "Chargement…", es: "Cargando…" },
  close: { fr: "Fermer", es: "Cerrar" },
  match: { fr: "Match", es: "Partido" },
} as const;

export type Key = keyof typeof dict;

export function t(lang: Lang, key: Key): string {
  return dict[key][lang];
}

export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "fr";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const code = l.toLowerCase().slice(0, 2);
    if (code === "fr") return "fr";
    if (code === "es") return "es";
  }
  return "fr";
}

export function locale(lang: Lang) {
  return lang === "fr" ? "fr-FR" : "es-CL";
}

// Zona horaria del dispositivo, detectada automáticamente.
export function deviceTZ() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function isInFrance() {
  return deviceTZ() === "Europe/Paris";
}

export function fmtTime(iso: string, lang: Lang) {
  // Formato 24 h (13:00), como se usa en Francia y Chile: evita "a. m." / "p. m." partidos en dos líneas.
  return new Date(iso).toLocaleTimeString(locale(lang), { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtDay(iso: string, lang: Lang) {
  const d = new Date(iso);
  const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86400000);
  if (diff === 0) return t(lang, "today");
  if (diff === 1) return t(lang, "tomorrow");
  if (diff === -1) return t(lang, "yesterday");
  const s = d.toLocaleDateString(locale(lang), { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
