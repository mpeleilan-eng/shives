import { describe, expect, it } from "vitest";
import { lienWhatsApp, messagePlanning, numeroWhatsApp, TOKEN } from "@/lib/partage";

describe("numeroWhatsApp", () => {
  it("met les numéros français au format international", () => {
    expect(numeroWhatsApp("06 12 34 56 78")).toBe("33612345678");
    expect(numeroWhatsApp("07.12.34.56.78")).toBe("33712345678");
    expect(numeroWhatsApp("+33 6 12 34 56 78")).toBe("33612345678");
    expect(numeroWhatsApp("0033612345678")).toBe("33612345678");
    expect(numeroWhatsApp("+32 470 12 34 56")).toBe("32470123456");
  });
  it("renvoie null si le numéro est absent ou incomplet", () => {
    expect(numeroWhatsApp("")).toBeNull();
    expect(numeroWhatsApp("06 12")).toBeNull();
  });
});

describe("lienWhatsApp", () => {
  it("prépare le message, avec ou sans numéro", () => {
    const msg = messagePlanning("Léa", "Crêperie du Port", "https://shives.fr/e/abc");
    expect(lienWhatsApp("06 12 34 56 78", msg)).toBe(`https://wa.me/33612345678?text=${encodeURIComponent(msg)}`);
    expect(lienWhatsApp("", msg).startsWith("https://wa.me/?text=")).toBe(true);
  });
});

describe("TOKEN", () => {
  it("n'accepte que des identifiants au bon format", () => {
    expect(TOKEN.test("3f2b8c1e-9a4d-4e7b-8c2a-1b2c3d4e5f60")).toBe(true);
    expect(TOKEN.test("' or 1=1 --")).toBe(false);
    expect(TOKEN.test("3f2b8c1e")).toBe(false);
  });
});
