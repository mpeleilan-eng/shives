import { describe, expect, it } from "vitest";
import {
  appliquerPause, calculerEtat, construireConfig, creneauxJournee, genererCreneaux, remplacerJournee, texteManque,
  type BesoinJour, type Creneau,
} from "@/lib/planning";
import { ajouterJours, estLundi, lundiDe, lundiProchain, titreSemaine } from "@/lib/dates";
import { REGLES_PAR_DEFAUT, type Employe, type Services } from "@/lib/types";

const services: Services = { midi: { start: "12:00", end: "16:00" }, soir: { start: "16:00", end: "23:00" } };
const besoins: BesoinJour[] = Array.from({ length: 7 }, (_, j) => (["midi", "soir"] as const).map((service) => ({
  jour: j, service, cuisine: 1, salle: 1, plonge: 0, ouvert: j !== 0,
}))).flat();
const emp = (id: string, poste: Employe["poste"], contrat: number, indispos: number[] = []): Employe => ({
  id, restaurant_id: "r", nom: id, poste, contrat_heures: contrat, telephone: "", indispos, token_acces: "t", actif: true, created_at: "",
});
const employes = [emp("Léa", "cuisine", 35), emp("Karim", "cuisine", 35), emp("Sofia", "salle", 35), emp("Tom", "salle", 24, [5])];
const regles = { ...REGLES_PAR_DEFAUT, pauseMinutes: 60 };

describe("construireConfig", () => {
  it("traduit la base en config du moteur (services fermés = 0 personne)", () => {
    const c = construireConfig(services, besoins, employes, regles);
    expect(c.days[0]).toEqual({ open: false, midi: { cuisine: 0, salle: 0, plonge: 0 }, soir: { cuisine: 0, salle: 0, plonge: 0 } });
    expect(c.days[1].open).toBe(true);
    expect(c.employees[3]).toEqual({ nom: "Tom", poste: "salle", contrat: 24, indispos: [5] });
    expect(c.rules).not.toHaveProperty("pauseMinutes");
  });
});

describe("appliquerPause", () => {
  const midi: Creneau = { employe_id: "a", jour: 1, service: "midi", poste: "salle", debut: "12:00", fin: "16:00" };
  const soir: Creneau = { ...midi, service: "soir", debut: "16:00", fin: "23:00" };

  it("décale le soir de qui fait midi + soir", () => {
    expect(appliquerPause([midi, soir], 60)[1]).toMatchObject({ debut: "17:00", fin: "23:00" });
  });
  it("ne touche pas qui fait seulement le soir, ni un resto qui ferme déjà assez longtemps", () => {
    expect(appliquerPause([soir], 60)).toEqual([soir]);
    const coupure = { ...soir, debut: "18:30" };
    expect(appliquerPause([midi, coupure], 60)[1].debut).toBe("18:30");
    expect(appliquerPause([midi, soir], 0)[1].debut).toBe("16:00");
  });
});

describe("genererCreneaux + calculerEtat", () => {
  const creneaux = genererCreneaux(services, besoins, employes, regles, 3);

  it("génère des créneaux reproductibles, avec la pause appliquée", () => {
    expect(genererCreneaux(services, besoins, employes, regles, 3)).toEqual(creneaux);
    expect(creneaux.length).toBeGreaterThan(0);
    for (const c of creneaux.filter((x) => x.service === "soir")) {
      const aussiMidi = creneaux.some((m) => m.employe_id === c.employe_id && m.jour === c.jour && m.service === "midi");
      expect(c.debut).toBe(aussiMidi ? "17:00" : "16:00");
    }
  });

  it("compte les effectifs et n'invente pas de violation de règle", () => {
    const etat = calculerEtat(creneaux, besoins, employes, regles);
    expect(etat.effectifs[0].midi).toMatchObject({ ouvert: false, besoin: 0, present: 0 });
    expect(etat.effectifs[1].midi.besoin).toBe(2);
    expect(etat.alertes.filter((a) => a.niveau === "regle")).toEqual([]);
  });

  it("signale un manque avec un texte clair", () => {
    const etat = calculerEtat([], besoins, employes, regles);
    expect(etat.alertes[0]).toEqual({ niveau: "manque", texte: "Il manque 1 cuisine mardi midi" });
    expect(texteManque(2, "plonge", 5, "soir")).toBe("Il manque 2 à la plonge samedi soir");
  });

  it("signale les règles non respectées après une modification à la main", () => {
    const tom: Creneau[] = [
      { employe_id: "Tom", jour: 5, service: "soir", poste: "salle", debut: "16:00", fin: "23:00" }, // indisponible samedi
      { employe_id: "Tom", jour: 6, service: "midi", poste: "salle", debut: "07:00", fin: "16:00" }, // 8 h de repos seulement
    ];
    const textes = calculerEtat(tom, besoins, employes, regles).alertes.map((a) => a.texte);
    expect(textes).toContain("Tom n'est pas disponible le samedi");
    expect(textes.some((t) => t.startsWith("Tom n'a que 8 h de repos"))).toBe(true);
  });
});

describe("ajustement à la main", () => {
  it("fabrique la journée choisie avec la pause, et la remplace dans le planning", () => {
    const journee = creneauxJournee("Léa", 2, [{ service: "soir", poste: "cuisine" }, { service: "midi", poste: "cuisine" }], services, 30);
    expect(journee).toEqual([
      { employe_id: "Léa", jour: 2, service: "midi", poste: "cuisine", debut: "12:00", fin: "16:00" },
      { employe_id: "Léa", jour: 2, service: "soir", poste: "cuisine", debut: "16:30", fin: "23:00" },
    ]);
    const avant: Creneau[] = [
      { employe_id: "Léa", jour: 2, service: "soir", poste: "cuisine", debut: "16:00", fin: "23:00" },
      { employe_id: "Tom", jour: 2, service: "soir", poste: "salle", debut: "16:00", fin: "23:00" },
    ];
    expect(remplacerJournee(avant, "Léa", 2, journee)).toHaveLength(3);
    expect(remplacerJournee(avant, "Léa", 2, [])).toEqual([avant[1]]);
  });

  it("recalcule les alertes après retrait", () => {
    const tout = genererCreneaux(services, besoins, employes, regles, 3);
    const premier = tout[0];
    const sans = remplacerJournee(tout, premier.employe_id, premier.jour, []);
    const avant = calculerEtat(tout, besoins, employes, regles).effectifs[premier.jour][premier.service].present;
    expect(calculerEtat(sans, besoins, employes, regles).effectifs[premier.jour][premier.service].present).toBe(avant - 1);
  });
});

describe("dates", () => {
  it("trouve les lundis", () => {
    expect(lundiDe("2026-10-15")).toBe("2026-10-12");
    expect(lundiDe("2026-10-12")).toBe("2026-10-12");
    expect(lundiDe("2026-10-18")).toBe("2026-10-12");
    expect(estLundi("2026-10-12")).toBe(true);
    expect(estLundi("2026-10-13")).toBe(false);
    expect(estLundi("2026-02-30")).toBe(false);
    expect(ajouterJours("2026-10-26", 7)).toBe("2026-11-02");
  });
  it("prépare la semaine prochaine, à l'heure de Paris", () => {
    expect(lundiProchain(new Date("2026-10-09T10:00:00Z"))).toBe("2026-10-12");
    // 21 h 30 UTC = dimanche 23 h 30 à Paris ; 22 h 30 UTC = déjà lundi 0 h 30 à Paris
    expect(lundiProchain(new Date("2026-10-11T21:30:00Z"))).toBe("2026-10-12");
    expect(lundiProchain(new Date("2026-10-11T22:30:00Z"))).toBe("2026-10-19");
  });
  it("écrit le titre de la semaine", () => {
    expect(titreSemaine("2026-10-12")).toBe("Semaine du 12 octobre");
    expect(titreSemaine("2026-06-01")).toBe("Semaine du 1er juin");
  });
});
