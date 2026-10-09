// Tout ce qui entoure le moteur : préparer sa config depuis la base, appliquer la pause,
// et recalculer effectifs + alertes à partir des créneaux (après génération ou modification à la main).

import { generatePlanning, toMin, type EngineConfig } from "@/lib/planning-engine";
import { formatHeures } from "@/lib/employe";
import { JOURS, NOM_SERVICE, POSTES, SERVICES, type Besoin, type Employe, type Poste, type Regles, type ServiceKey, type Services } from "@/lib/types";

/** Un créneau de travail (= une ligne de la table creneaux, sans les ids techniques). */
export type Creneau = {
  employe_id: string;
  jour: number;
  service: ServiceKey;
  poste: Poste;
  debut: string; // "HH:MM"
  fin: string;
};

export type BesoinJour = Pick<Besoin, "jour" | "service" | "cuisine" | "salle" | "plonge" | "ouvert">;

// ───────────────────────── 1) Config du moteur ─────────────────────────

export function construireConfig(services: Services, besoins: BesoinJour[], employes: Employe[], regles: Regles): EngineConfig {
  const trouver = (j: number, s: ServiceKey) => besoins.find((b) => b.jour === j && b.service === s);
  return {
    services: { midi: { ...services.midi }, soir: { ...services.soir } },
    days: Array.from({ length: 7 }, (_, j) => {
      const jour: EngineConfig["days"][number] = { open: false };
      for (const s of SERVICES) {
        const b = trouver(j, s);
        if (b?.ouvert) jour.open = true;
        jour[s] = b?.ouvert ? { cuisine: b.cuisine, salle: b.salle, plonge: b.plonge } : { cuisine: 0, salle: 0, plonge: 0 };
      }
      return jour;
    }),
    employees: employes.map((e) => ({ nom: e.nom, poste: e.poste, contrat: Number(e.contrat_heures), indispos: e.indispos })),
    rules: {
      maxJours: regles.maxJours,
      maxHeuresJour: regles.maxHeuresJour,
      reposMin: regles.reposMin,
      completerContrats: regles.completerContrats,
    },
  };
}

// ───────────────────────── 2) Génération + pause ─────────────────────────

const enHeure = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Pause (option A, autour du moteur) : si quelqu'un fait midi ET soir le même jour et que le resto
 * ne ferme pas assez longtemps entre les deux, le service du soir commence plus tard pour lui.
 * La pause est donc retirée de ses heures.
 */
export function appliquerPause(creneaux: Creneau[], pauseMinutes: number): Creneau[] {
  if (!pauseMinutes) return creneaux;
  return creneaux.map((c) => {
    if (c.service !== "soir") return c;
    const midi = creneaux.find((m) => m.employe_id === c.employe_id && m.jour === c.jour && m.service === "midi");
    if (!midi) return c;
    const debutAvecPause = toMin(midi.fin) + pauseMinutes;
    if (toMin(c.debut) >= debutAvecPause || debutAvecPause >= toMin(c.fin)) return c;
    return { ...c, debut: enHeure(debutAvecPause) };
  });
}

/** Lance le moteur et renvoie les créneaux à enregistrer (pause appliquée). */
export function genererCreneaux(
  services: Services, besoins: BesoinJour[], employes: Employe[], regles: Regles, seed: number,
): Creneau[] {
  const resultat = generatePlanning(construireConfig(services, besoins, employes, regles), seed);
  const creneaux: Creneau[] = resultat.employes.flatMap((e, i) =>
    e.planning.flatMap((jour, j) =>
      jour.map((c) => ({ employe_id: employes[i].id, jour: j, service: c.service as ServiceKey, poste: c.poste, debut: c.debut, fin: c.fin })),
    ),
  );
  return appliquerPause(creneaux, regles.pauseMinutes);
}

/** Choix fait à la main pour une case (un employé, un jour) : quels services, à quel poste. */
export type ChoixJournee = { service: ServiceKey; poste: Poste }[];

/** Fabrique les créneaux d'une journée choisie à la main (horaires du service + pause). */
export function creneauxJournee(
  employeId: string, jour: number, choix: ChoixJournee, services: Services, pauseMinutes: number,
): Creneau[] {
  const bruts = SERVICES.flatMap((s) => {
    const c = choix.find((x) => x.service === s);
    return c ? [{ employe_id: employeId, jour, service: s, poste: c.poste, debut: services[s].start, fin: services[s].end }] : [];
  });
  return appliquerPause(bruts, pauseMinutes);
}

/** Remplace la journée d'un employé dans la liste de créneaux. */
export function remplacerJournee(creneaux: Creneau[], employeId: string, jour: number, nouveaux: Creneau[]): Creneau[] {
  return [...creneaux.filter((c) => !(c.employe_id === employeId && c.jour === jour)), ...nouveaux];
}

// ───────────────────────── 3) Effectifs et alertes ─────────────────────────

export type Alerte = { niveau: "manque" | "regle" | "info"; texte: string };
export type EffectifService = { present: number; besoin: number; ouvert: boolean; parPoste: Record<Poste, { present: number; besoin: number }> };
export type EtatPlanning = {
  effectifs: Record<ServiceKey, EffectifService>[];
  minutesParEmploye: Record<string, number>;
  alertes: Alerte[];
};

const DE_POSTE: Record<Poste, string> = { cuisine: "en cuisine", salle: "en salle", plonge: "à la plonge" };
const jourMin = (j: number) => JOURS[j].toLowerCase();

/** « Il manque 1 salle samedi midi » / « Il manque 2 en cuisine samedi midi » */
export function texteManque(n: number, poste: Poste, jour: number, service: ServiceKey) {
  return `Il manque ${n === 1 ? `1 ${poste}` : `${n} ${DE_POSTE[poste]}`} ${jourMin(jour)} ${NOM_SERVICE[service].toLowerCase()}`;
}

export function calculerEtat(creneaux: Creneau[], besoins: BesoinJour[], employes: Employe[], regles: Regles): EtatPlanning {
  const alertes: Alerte[] = [];

  // Effectifs par jour / service / poste
  const effectifs = Array.from({ length: 7 }, (_, j) =>
    Object.fromEntries(SERVICES.map((s) => {
      const b = besoins.find((x) => x.jour === j && x.service === s);
      const ouvert = Boolean(b?.ouvert);
      const ici = creneaux.filter((c) => c.jour === j && c.service === s);
      const parPoste = Object.fromEntries(POSTES.map((p) => [p, {
        present: ici.filter((c) => c.poste === p).length,
        besoin: ouvert && b ? b[p] : 0,
      }])) as EffectifService["parPoste"];
      return [s, {
        present: ici.length,
        besoin: POSTES.reduce((t, p) => t + parPoste[p].besoin, 0),
        ouvert,
        parPoste,
      }];
    })) as Record<ServiceKey, EffectifService>,
  );

  effectifs.forEach((jour, j) => {
    for (const s of SERVICES) {
      for (const p of POSTES) {
        const { present, besoin } = jour[s].parPoste[p];
        if (present < besoin) alertes.push({ niveau: "manque", texte: texteManque(besoin - present, p, j, s) });
      }
      if (!jour[s].ouvert && jour[s].present > 0) {
        alertes.push({ niveau: "regle", texte: `Le restaurant est fermé ${jourMin(j)} ${NOM_SERVICE[s].toLowerCase()}, mais quelqu'un est placé` });
      }
    }
  });

  // Par employé : heures, contrat, règles
  const minutesParEmploye: Record<string, number> = {};
  for (const e of employes) {
    const siens = creneaux.filter((c) => c.employe_id === e.id);
    const minutesJour = Array.from({ length: 7 }, (_, j) =>
      siens.filter((c) => c.jour === j).reduce((t, c) => t + toMin(c.fin) - toMin(c.debut), 0));
    const total = minutesJour.reduce((a, b) => a + b, 0);
    minutesParEmploye[e.id] = total;
    if (!siens.length && !e.actif) continue;

    const joursTravailles = minutesJour.filter((m) => m > 0).length;
    if (joursTravailles > regles.maxJours) {
      alertes.push({ niveau: "regle", texte: `${e.nom} travaille ${joursTravailles} jours (maximum ${regles.maxJours})` });
    }
    minutesJour.forEach((m, j) => {
      if (m > regles.maxHeuresJour * 60) alertes.push({ niveau: "regle", texte: `${e.nom} fait ${formatHeures(m / 60)} ${jourMin(j)} (maximum ${regles.maxHeuresJour} h)` });
      if (m > 0 && e.indispos.includes(j)) alertes.push({ niveau: "regle", texte: `${e.nom} n'est pas disponible le ${jourMin(j)}` });
    });
    for (let j = 0; j < 6; j++) {
      const auj = siens.filter((c) => c.jour === j), dem = siens.filter((c) => c.jour === j + 1);
      if (!auj.length || !dem.length) continue;
      const repos = 1440 - Math.max(...auj.map((c) => toMin(c.fin))) + Math.min(...dem.map((c) => toMin(c.debut)));
      if (repos < regles.reposMin * 60) {
        alertes.push({ niveau: "regle", texte: `${e.nom} n'a que ${formatHeures(repos / 60)} de repos entre ${jourMin(j)} et ${jourMin(j + 1)} (minimum ${regles.reposMin} h)` });
      }
    }

    const contrat = Number(e.contrat_heures) * 60;
    if (contrat && total - contrat >= 30) {
      alertes.push({ niveau: "info", texte: `${e.nom} : ${formatHeures(total / 60)} sur ${formatHeures(contrat / 60)} (${formatHeures((total - contrat) / 60)} en plus)` });
    } else if (contrat - total >= 30 && e.actif) {
      alertes.push({ niveau: "info", texte: `${e.nom} : ${formatHeures(total / 60)} sur ${formatHeures(contrat / 60)} (il manque ${formatHeures((contrat - total) / 60)})` });
    }
  }

  const ordre = { manque: 0, regle: 1, info: 2 };
  alertes.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
  return { effectifs, minutesParEmploye, alertes };
}
