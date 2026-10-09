import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { generatePlanning, toMin, type EngineConfig, type EnginePosteEmploye } from "@/lib/planning-engine";

// Le moteur d'origine (planning-engine.js), gardé tel quel comme référence
const require = createRequire(import.meta.url);
const original = require("./fixtures/planning-engine.original.js") as { generatePlanning: (c: unknown, s?: number) => unknown };

// ── Fabrique de restaurants au hasard (reproductible) ──
function alea(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}
function restaurantAuHasard(n: number): EngineConfig {
  const r = alea(n);
  const ent = (min: number, max: number) => min + Math.floor(r() * (max - min + 1));
  const postes: EnginePosteEmploye[] = ["cuisine", "salle", "plonge", "polyvalent"];
  const continu = r() < 0.3;
  const services = continu
    ? { midi: { start: "11:00", end: "16:00" }, soir: { start: "16:00", end: "23:00" } }
    : { midi: { start: `1${ent(0, 1)}:${r() < 0.5 ? "00" : "30"}`, end: "15:00" }, soir: { start: "18:30", end: `2${ent(2, 3)}:00` } };
  return {
    services,
    days: Array.from({ length: 7 }, () => ({
      open: r() > 0.15,
      midi: { cuisine: ent(0, 3), salle: ent(0, 3), plonge: ent(0, 1) },
      soir: { cuisine: ent(0, 3), salle: ent(0, 3), plonge: ent(0, 1) },
    })),
    employees: Array.from({ length: ent(1, 15) }, (_, i) => ({
      nom: `E${i}`,
      poste: postes[ent(0, 3)],
      contrat: [35, 24, 20, 39, 18, 0][ent(0, 5)],
      indispos: [0, 1, 2, 3, 4, 5, 6].filter(() => r() < 0.15),
    })),
    rules: { maxJours: ent(4, 6), maxHeuresJour: ent(8, 12), reposMin: ent(9, 12), completerContrats: r() < 0.7 },
  };
}

const exemple: EngineConfig = {
  services: { midi: { start: "11:00", end: "15:00" }, soir: { start: "18:30", end: "23:00" } },
  days: Array.from({ length: 7 }, (_, d) => ({
    open: d !== 0,
    midi: { cuisine: 1, salle: 2, plonge: d >= 5 ? 1 : 0 },
    soir: { cuisine: 2, salle: 2, plonge: 1 },
  })),
  employees: [
    { nom: "Léa", poste: "cuisine", contrat: 35, indispos: [2] },
    { nom: "Karim", poste: "cuisine", contrat: 35 },
    { nom: "Sofia", poste: "salle", contrat: 35 },
    { nom: "Tom", poste: "salle", contrat: 24 },
    { nom: "Inès", poste: "salle", contrat: 20, indispos: [0, 1] },
    { nom: "Hugo", poste: "plonge", contrat: 20 },
    { nom: "Nora", poste: "polyvalent", contrat: 35 },
  ],
  rules: { maxJours: 5, maxHeuresJour: 11, reposMin: 11, completerContrats: true },
};

describe("conversion TypeScript", () => {
  it("donne exactement le même résultat que planning-engine.js (150 restaurants × 2 seeds)", () => {
    for (let n = 1; n <= 150; n++) {
      const config = restaurantAuHasard(n);
      for (const seed of [n, n * 7919]) {
        expect(generatePlanning(config, seed)).toEqual(original.generatePlanning(config, seed));
      }
    }
  }, 60_000);

  it("génère une semaine en moins de 200 ms", () => {
    const debut = performance.now();
    generatePlanning(exemple, 5);
    expect(performance.now() - debut).toBeLessThan(200);
  });

  it("utilise seed = 1 par défaut, comme l'original", () => {
    expect(generatePlanning(exemple)).toEqual(original.generatePlanning(exemple));
  });
});

describe("comportement du moteur", () => {
  const res = generatePlanning(exemple, 7);
  const rules = exemple.rules as Required<NonNullable<EngineConfig["rules"]>>;

  it("même config + même seed = même planning ; autre seed = autre proposition", () => {
    expect(generatePlanning(exemple, 7)).toEqual(res);
    const autres = [8, 9, 10, 11].map((s) => JSON.stringify(generatePlanning(exemple, s).employes));
    expect(autres.some((a) => a !== JSON.stringify(res.employes))).toBe(true);
  });

  it("ne dépasse jamais le contrat, les jours max ni les heures max par jour", () => {
    for (const e of res.employes) {
      expect(e.minutes).toBeLessThanOrEqual(e.contrat * 60);
      expect(e.planning.filter((j) => j.length).length).toBeLessThanOrEqual(rules.maxJours);
      for (const jour of e.planning) {
        const minutes = jour.reduce((t, c) => t + toMin(c.fin) - toMin(c.debut), 0);
        expect(minutes).toBeLessThanOrEqual(rules.maxHeuresJour * 60);
      }
    }
  });

  it("respecte le repos minimum entre deux journées", () => {
    for (const e of res.employes) {
      for (let d = 0; d < 6; d++) {
        const auj = e.planning[d], dem = e.planning[d + 1];
        if (!auj.length || !dem.length) continue;
        const fin = Math.max(...auj.map((c) => toMin(c.fin)));
        const debut = Math.min(...dem.map((c) => toMin(c.debut)));
        expect(1440 - fin + debut).toBeGreaterThanOrEqual(rules.reposMin * 60);
      }
    }
  });

  it("respecte les indisponibilités, les jours fermés et les postes", () => {
    res.employes.forEach((e, i) => {
      const indispos = exemple.employees[i].indispos ?? [];
      e.planning.forEach((jour, d) => {
        if (indispos.includes(d) || !exemple.days[d].open) expect(jour).toEqual([]);
        for (const c of jour) if (e.poste !== "polyvalent") expect(c.poste).toBe(e.poste);
      });
    });
  });

  it("signale les manques quand l'équipe est trop petite", () => {
    const petit = { ...exemple, employees: exemple.employees.slice(0, 2) };
    const r = generatePlanning(petit, 1);
    expect(r.manques.length).toBeGreaterThan(0);
    expect(r.alertes.some((a) => a.niveau === "manque")).toBe(true);
  });

  it("sans « compléter les contrats », ne place personne au-delà des besoins", () => {
    const r = generatePlanning({ ...exemple, rules: { ...rules, completerContrats: false } }, 3);
    r.effectifs.forEach((jour) => {
      for (const s of Object.values(jour)) expect(s.present).toBeLessThanOrEqual(s.besoin);
    });
  });
});
