import { describe, expect, it } from "vitest";
import { verifierDemande } from "@/lib/demo";

const base = { prenom: "Léa", restaurant: "Crêperie du Port", ville: "Brest", taille: "6 à 10", contact: "06 12 34 56 78" };

describe("verifierDemande", () => {
  it("accepte une demande complète et nettoie les espaces", () => {
    const r = verifierDemande({ ...base, prenom: "  Léa  ", restaurant: "Crêperie   du Port" });
    expect(r).toEqual({ ok: true, demande: { ...base, restaurant: "Crêperie du Port" } });
  });

  it("accepte un e-mail comme contact", () => {
    expect(verifierDemande({ ...base, contact: "lea@exemple.fr" }).ok).toBe(true);
  });

  it("refuse s'il manque le prénom, le restaurant ou le contact", () => {
    for (const champ of ["prenom", "restaurant", "contact"]) {
      const r = verifierDemande({ ...base, [champ]: "   " });
      expect(r.ok).toBe(false);
    }
  });

  it("refuse un contact qui n'est ni un téléphone ni un e-mail", () => {
    expect(verifierDemande({ ...base, contact: "bonjour" }).ok).toBe(false);
    expect(verifierDemande({ ...base, contact: "1234" }).ok).toBe(false);
  });

  it("refuse une taille hors liste et les champs trop longs", () => {
    expect(verifierDemande({ ...base, taille: "1000" }).ok).toBe(false);
    expect(verifierDemande({ ...base, restaurant: "x".repeat(101) }).ok).toBe(false);
  });

  it("résiste aux données bizarres", () => {
    expect(verifierDemande(null).ok).toBe(false);
    expect(verifierDemande("texte").ok).toBe(false);
    expect(verifierDemande({ ...base, prenom: 42 }).ok).toBe(false);
  });
});
