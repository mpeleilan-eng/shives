// Règles du formulaire « Demander une démo », partagées entre le formulaire et la route serveur.

export const TAILLES = ["1 à 5", "6 à 10", "11 à 15", "Plus de 15"] as const;

export type DemandeDemo = {
  prenom: string;
  restaurant: string;
  ville: string;
  taille: (typeof TAILLES)[number];
  contact: string;
};

const MAX = { prenom: 60, restaurant: 100, ville: 80, contact: 120 };

/** Nettoie et vérifie les données reçues. Renvoie la demande propre, ou un message d'erreur. */
export function verifierDemande(brut: unknown): { ok: true; demande: DemandeDemo } | { ok: false; erreur: string } {
  const d = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const txt = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

  const demande = {
    prenom: txt(d.prenom),
    restaurant: txt(d.restaurant),
    ville: txt(d.ville),
    taille: txt(d.taille),
    contact: txt(d.contact),
  };

  if (!demande.prenom || !demande.restaurant || !demande.contact) {
    return { ok: false, erreur: "Remplis ton prénom, ton restaurant et un moyen de te contacter." };
  }
  for (const [champ, max] of Object.entries(MAX)) {
    if (demande[champ as keyof typeof MAX].length > max) return { ok: false, erreur: "Un des champs est trop long." };
  }
  if (!(TAILLES as readonly string[]).includes(demande.taille)) {
    return { ok: false, erreur: "Choisis le nombre de salariés dans la liste." };
  }
  const estEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demande.contact);
  const estTel = demande.contact.replace(/[^\d]/g, "").length >= 9 && /^[\d\s+().-]+$/.test(demande.contact);
  if (!estEmail && !estTel) {
    return { ok: false, erreur: "Indique un numéro de téléphone ou une adresse e-mail valide." };
  }
  return { ok: true, demande: demande as DemandeDemo };
}
