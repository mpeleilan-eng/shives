import { describe, expect, it } from "vitest";
import { verifierRestaurant } from "@/lib/restaurant";
import { cheminSur } from "@/lib/site-url";

function formulaire(champs: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}
const base = {
  nom: "  Crêperie   du Port ",
  "midi-debut": "11:00", "midi-fin": "15:00",
  "soir-debut": "18:30", "soir-fin": "23:00",
  "ouvert-5-midi": "on", "ouvert-5-soir": "on", "ouvert-6-midi": "on",
};

describe("verifierRestaurant", () => {
  it("accepte un restaurant valide", () => {
    const r = verifierRestaurant(formulaire(base));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.infos.nom).toBe("Crêperie du Port");
    expect(r.infos.services).toEqual({ midi: { start: "11:00", end: "15:00" }, soir: { start: "18:30", end: "23:00" } });
    expect(r.infos.ouverture[5]).toEqual({ midi: true, soir: true });
    expect(r.infos.ouverture[6]).toEqual({ midi: true, soir: false });
    expect(r.infos.ouverture[0]).toEqual({ midi: false, soir: false });
  });

  it("refuse sans nom", () => {
    expect(verifierRestaurant(formulaire({ ...base, nom: " " })).ok).toBe(false);
  });

  it("refuse un service qui finit avant de commencer", () => {
    expect(verifierRestaurant(formulaire({ ...base, "soir-fin": "17:00" })).ok).toBe(false);
  });

  it("refuse un midi qui chevauche le soir", () => {
    expect(verifierRestaurant(formulaire({ ...base, "midi-fin": "19:00" })).ok).toBe(false);
  });

  it("refuse une heure mal écrite", () => {
    expect(verifierRestaurant(formulaire({ ...base, "midi-debut": "25:00" })).ok).toBe(false);
  });

  it("refuse un restaurant fermé toute la semaine", () => {
    const ferme = Object.fromEntries(Object.entries(base).filter(([k]) => !k.startsWith("ouvert-")));
    expect(verifierRestaurant(formulaire(ferme)).ok).toBe(false);
  });
});

describe("cheminSur", () => {
  it("garde les chemins internes et refuse les autres sites", () => {
    expect(cheminSur("/app/equipe")).toBe("/app/equipe");
    expect(cheminSur("https://pirate.com")).toBe("/app");
    expect(cheminSur("//pirate.com")).toBe("/app");
    expect(cheminSur(null)).toBe("/app");
  });
});
