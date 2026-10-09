import { describe, expect, it } from "vitest";
import { abonnementActif, abonnementDepuisStripe, maxEmployes, offrePourPrix } from "@/lib/abonnement";

const prix = { solo: "price_solo", equipe: "price_equipe" };

describe("abonnement", () => {
  it("reconnaît l'offre à partir du prix Stripe", () => {
    expect(offrePourPrix("price_solo", prix)).toBe("solo");
    expect(offrePourPrix("price_equipe", prix)).toBe("equipe");
    expect(offrePourPrix("price_inconnu", prix)).toBeNull();
    expect(offrePourPrix(undefined, prix)).toBeNull();
  });

  it("active le compte pendant l'essai, le paiement ou un retard de paiement", () => {
    expect(abonnementDepuisStripe("trialing", "solo")).toBe("solo");
    expect(abonnementDepuisStripe("active", "equipe")).toBe("equipe");
    expect(abonnementDepuisStripe("past_due", "solo")).toBe("solo");
  });

  it("désactive après résiliation ou impayé, et pour un prix inconnu", () => {
    for (const s of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
      expect(abonnementDepuisStripe(s, "solo")).toBe("inactif");
    }
    expect(abonnementDepuisStripe("active", null)).toBe("inactif");
  });

  it("limite le nombre de salariés et la publication", () => {
    expect(maxEmployes("solo")).toBe(8);
    expect(maxEmployes("equipe")).toBe(20);
    expect(maxEmployes("essai")).toBe(20);
    expect(abonnementActif("essai")).toBe(false);
    expect(abonnementActif("inactif")).toBe(false);
    expect(abonnementActif("solo")).toBe(true);
  });
});
