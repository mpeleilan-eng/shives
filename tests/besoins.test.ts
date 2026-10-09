import { describe, expect, it } from "vitest";
import { heuresNecessaires, reglesCompletes, verifierBesoinsEtRegles, type GrilleBesoins } from "@/lib/besoins";
import { REGLES_PAR_DEFAUT } from "@/lib/types";

const jour = (c: number, s: number, p: number) => ({ midi: { cuisine: c, salle: s, plonge: p }, soir: { cuisine: c, salle: s, plonge: p } });
const grille: GrilleBesoins = Array.from({ length: 7 }, () => jour(1, 2, 0));
const regles = { maxJours: 5, maxHeuresJour: 11, reposMin: 11, completerContrats: true, pauseMinutes: 30 };

describe("verifierBesoinsEtRegles", () => {
  it("accepte une grille et des règles valides", () => {
    const r = verifierBesoinsEtRegles({ grille, regles });
    expect(r).toEqual({ ok: true, grille, regles });
  });

  it("refuse une grille incomplète ou des nombres impossibles", () => {
    expect(verifierBesoinsEtRegles({ grille: grille.slice(0, 6), regles }).ok).toBe(false);
    const negatif = grille.map((j, i) => (i === 3 ? jour(-1, 0, 0) : j));
    expect(verifierBesoinsEtRegles({ grille: negatif, regles }).ok).toBe(false);
    const decimal = grille.map((j, i) => (i === 3 ? jour(1.5, 0, 0) : j));
    expect(verifierBesoinsEtRegles({ grille: decimal, regles }).ok).toBe(false);
  });

  it("refuse des règles hors limites", () => {
    expect(verifierBesoinsEtRegles({ grille, regles: { ...regles, maxJours: 8 } }).ok).toBe(false);
    expect(verifierBesoinsEtRegles({ grille, regles: { ...regles, maxHeuresJour: 0 } }).ok).toBe(false);
    expect(verifierBesoinsEtRegles({ grille, regles: { ...regles, pauseMinutes: 45 } }).ok).toBe(false);
    expect(verifierBesoinsEtRegles({ grille, regles: { ...regles, completerContrats: "oui" } }).ok).toBe(false);
  });

  it("ne garde que les règles connues", () => {
    const r = verifierBesoinsEtRegles({ grille, regles: { ...regles, abonnement: "equipe" } });
    expect(r.ok && r.regles).toEqual(regles);
  });
});

describe("reglesCompletes", () => {
  it("complète les anciennes règles sans pause", () => {
    expect(reglesCompletes({ maxJours: 6 })).toEqual({ ...REGLES_PAR_DEFAUT, maxJours: 6 });
    expect(reglesCompletes(null)).toEqual(REGLES_PAR_DEFAUT);
  });
});

describe("heuresNecessaires", () => {
  it("compte les heures des services ouverts uniquement", () => {
    const ouverture = Array.from({ length: 7 }, (_, j) => ({ midi: j !== 0, soir: j !== 0 }));
    // 6 jours × (3 personnes × 4 h + 3 personnes × 5 h) = 6 × 27 = 162 h
    expect(heuresNecessaires(grille, ouverture, { midi: 240, soir: 300 })).toBe(162);
  });
});
