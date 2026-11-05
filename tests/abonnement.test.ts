import { describe, expect, it } from "vitest";
import { abonnementActif, abonnementDepuisStripe, maxEmployes, offrePourPrix, tranche } from "@/lib/abonnement";

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

describe("bêta restos fondateurs", () => {
  it("donne un accès complet et gratuit (publication, 20 salariés)", () => {
    expect(abonnementActif("beta")).toBe(true);
    expect(maxEmployes("beta")).toBe(20);
  });

  it("range le nombre de salariés dans la bonne tranche", () => {
    expect(tranche(0)).toBe("1 à 5");
    expect(tranche(5)).toBe("1 à 5");
    expect(tranche(6)).toBe("6 à 10");
    expect(tranche(15)).toBe("11 à 15");
    expect(tranche(16)).toBe("Plus de 15");
  });
});
