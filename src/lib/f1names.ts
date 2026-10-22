// Nombres de los Grandes Premios en francés y español (la fuente los da en inglés).
const GP: [RegExp, string, string][] = [
  [/australian/i, "d'Australie", "de Australia"],
  [/chinese/i, "de Chine", "de China"],
  [/japanese/i, "du Japon", "de Japón"],
  [/bahrain/i, "de Bahreïn", "de Baréin"],
  [/saudi/i, "d'Arabie saoudite", "de Arabia Saudita"],
  [/miami/i, "de Miami", "de Miami"],
  [/emilia/i, "d'Émilie-Romagne", "de Emilia-Romaña"],
  [/monaco/i, "de Monaco", "de Mónaco"],
  [/barcelona|catalunya/i, "de Barcelone-Catalogne", "de Barcelona-Cataluña"],
  [/spanish|madrid/i, "d'Espagne", "de España"],
  [/canadian/i, "du Canada", "de Canadá"],
  [/austrian/i, "d'Autriche", "de Austria"],
  [/british/i, "de Grande-Bretagne", "de Gran Bretaña"],
  [/belgian/i, "de Belgique", "de Bélgica"],
  [/hungarian/i, "de Hongrie", "de Hungría"],
  [/dutch/i, "des Pays-Bas", "de los Países Bajos"],
  [/italian/i, "d'Italie", "de Italia"],
  [/azerbaijan/i, "d'Azerbaïdjan", "de Azerbaiyán"],
  [/singapore/i, "de Singapour", "de Singapur"],
  [/united states/i, "des États-Unis", "de Estados Unidos"],
  [/mexico/i, "de Mexico", "de la Ciudad de México"],
  [/s[ãa]o paulo|brazil/i, "de São Paulo", "de São Paulo"],
  [/las vegas/i, "de Las Vegas", "de Las Vegas"],
  [/qatar/i, "du Qatar", "de Catar"],
  [/abu dhabi/i, "d'Abou Dabi", "de Abu Dabi"],
  [/french/i, "de France", "de Francia"],
  [/portuguese/i, "du Portugal", "de Portugal"],
  [/turkish/i, "de Turquie", "de Turquía"],
];

export function gpName(raceName: string | undefined, lang: "fr" | "es"): string {
  if (!raceName) return "";
  const hit = GP.find(([re]) => re.test(raceName));
  if (!hit) return raceName;
  return lang === "fr" ? `Grand Prix ${hit[1]}` : `Gran Premio ${hit[2]}`;
}
