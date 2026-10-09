// Dates de semaine au format "AAAA-MM-JJ", calculées en UTC pour éviter les décalages d'heure d'été.

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const versIso = (d: Date) => d.toISOString().slice(0, 10);

export function estDateIso(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && versIso(versDate(s)) === s;
}

/** Lundi de la semaine qui contient cette date. */
export function lundiDe(iso: string) {
  const d = versDate(iso);
  const decalage = (d.getUTCDay() + 6) % 7; // lundi = 0 … dimanche = 6
  d.setUTCDate(d.getUTCDate() - decalage);
  return versIso(d);
}

export function estLundi(iso: string) {
  return estDateIso(iso) && lundiDe(iso) === iso;
}

export function ajouterJours(iso: string, n: number) {
  const d = versDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return versIso(d);
}

/** Aujourd'hui en France (le serveur Vercel tourne en UTC). */
export function aujourdhuiParis(maintenant = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(maintenant);
}

/** La semaine à préparer : la semaine prochaine. */
export function lundiProchain(maintenant = new Date()) {
  return ajouterJours(lundiDe(aujourdhuiParis(maintenant)), 7);
}

/** "Semaine du 12 octobre" */
export function titreSemaine(lundi: string) {
  const d = versDate(lundi);
  return `Semaine du ${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

/** Numéro du jour dans le mois pour le jour j (0 = lundi) de la semaine. */
export function numeroDuJour(lundi: string, j: number) {
  return versDate(ajouterJours(lundi, j)).getUTCDate();
}
