import { describe, expect, it } from "vitest";
import { formatHeures, verifierEmploye } from "@/lib/employe";

function formulaire(champs: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}
const base = { nom: " Léa  Martin ", poste: "cuisine", contrat_heures: "35", telephone: "06 12 34 56 78", "indispo-2": "on" };

describe("verifierEmploye", () => {
  it("accepte un employé valide", () => {
    expect(verifierEmploye(formulaire(base))).toEqual({
      ok: true,
      infos: { nom: "Léa Martin", poste: "cuisine", contrat_heures: 35, telephone: "06 12 34 56 78", indispos: [2] },
    });
  });

  it("accepte les demi-heures avec une virgule et sans téléphone", () => {
    const r = verifierEmploye(formulaire({ ...base, contrat_heures: "24,5", telephone: "" }));
    expect(r.ok && r.infos.contrat_heures).toBe(24.5);
  });

  it("refuse un poste inconnu, un nom vide, des heures impossibles", () => {
    expect(verifierEmploye(formulaire({ ...base, poste: "chef" })).ok).toBe(false);
    expect(verifierEmploye(formulaire({ ...base, nom: "  " })).ok).toBe(false);
    expect(verifierEmploye(formulaire({ ...base, contrat_heures: "70" })).ok).toBe(false);
    expect(verifierEmploye(formulaire({ ...base, contrat_heures: "abc" })).ok).toBe(false);
    expect(verifierEmploye(formulaire({ ...base, contrat_heures: "24.2" })).ok).toBe(false);
  });

  it("refuse un téléphone invalide et une indisponibilité toute la semaine", () => {
    expect(verifierEmploye(formulaire({ ...base, telephone: "appelle-moi" })).ok).toBe(false);
    const tousLesJours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((j) => [`indispo-${j}`, "on"]));
    expect(verifierEmploye(formulaire({ ...base, ...tousLesJours })).ok).toBe(false);
  });
});

describe("formatHeures", () => {
  it("affiche les heures lisiblement", () => {
    expect(formatHeures(35)).toBe("35 h");
    expect(formatHeures(24.5)).toBe("24 h 30");
  });
});
