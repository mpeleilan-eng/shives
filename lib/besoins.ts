import { PAUSES_POSSIBLES, POSTES, REGLES_PAR_DEFAUT, SERVICES, type Poste, type Regles, type ServiceKey } from "@/lib/types";

export type Effectifs = Record<Poste, number>;
/** besoins[jour][service] = nombre de personnes par poste */
export type GrilleBesoins = Record<ServiceKey, Effectifs>[];

export const MAX_PAR_POSTE = 30;

/** Règles enregistrées + valeurs par défaut pour ce qui manque (anciens restaurants). */
export function reglesCompletes(regles: Partial<Regles> | null | undefined): Regles {
  return { ...REGLES_PAR_DEFAUT, ...(regles ?? {}) };
}

const entier = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** Vérifie ce que la page « Besoins et règles » envoie. */
export function verifierBesoinsEtRegles(
  brut: unknown,
): { ok: true; grille: GrilleBesoins; regles: Regles } | { ok: false; erreur: string } {
  const d = (brut && typeof brut === "object" ? brut : {}) as { grille?: unknown; regles?: unknown };

  if (!Array.isArray(d.grille) || d.grille.length !== 7) return { ok: false, erreur: "Grille des besoins incomplète." };
  const grille: GrilleBesoins = [];
  for (const jour of d.grille as Record<string, Record<string, unknown>>[]) {
    const ligne = {} as Record<ServiceKey, Effectifs>;
    for (const s of SERVICES) {
      const eff = {} as Effectifs;
      for (const p of POSTES) {
        const v = jour?.[s]?.[p];
        if (!entier(v, 0, MAX_PAR_POSTE)) return { ok: false, erreur: `Le nombre de personnes doit être entre 0 et ${MAX_PAR_POSTE}.` };
        eff[p] = v as number;
      }
      ligne[s] = eff;
    }
    grille.push(ligne);
  }

  const r = (d.regles && typeof d.regles === "object" ? d.regles : {}) as Record<string, unknown>;
  if (!entier(r.maxJours, 1, 7)) return { ok: false, erreur: "Jours max par semaine : entre 1 et 7." };
  if (!entier(r.maxHeuresJour, 1, 24)) return { ok: false, erreur: "Heures max par jour : entre 1 et 24." };
  if (!entier(r.reposMin, 0, 24)) return { ok: false, erreur: "Repos entre deux journées : entre 0 et 24 h." };
  if (typeof r.completerContrats !== "boolean") return { ok: false, erreur: "Option « compléter les contrats » invalide." };
  if (!PAUSES_POSSIBLES.includes(r.pauseMinutes as number)) return { ok: false, erreur: "Durée de pause invalide." };

  return {
    ok: true,
    grille,
    regles: {
      maxJours: r.maxJours as number,
      maxHeuresJour: r.maxHeuresJour as number,
      reposMin: r.reposMin as number,
      completerContrats: r.completerContrats,
      pauseMinutes: r.pauseMinutes as number,
    },
  };
}

/** Heures de travail nécessaires sur la semaine (services ouverts uniquement). */
export function heuresNecessaires(
  grille: GrilleBesoins,
  ouverture: Record<ServiceKey, boolean>[],
  dureeMinutes: Record<ServiceKey, number>,
) {
  let minutes = 0;
  grille.forEach((jour, j) => {
    for (const s of SERVICES) {
      if (!ouverture[j][s]) continue;
      minutes += POSTES.reduce((t, p) => t + jour[s][p], 0) * dureeMinutes[s];
    }
  });
  return minutes / 60;
}
