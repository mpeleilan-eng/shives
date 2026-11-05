// Offres Shives et règles liées à l'abonnement (logique pure, testée).

import type { Restaurant } from "@/lib/types";

export type Offre = "solo" | "equipe";
export type Abonnement = Restaurant["abonnement"]; // "essai" | "beta" | "solo" | "equipe" | "inactif"

export const OFFRES: Record<Offre, { nom: string; prix: number; maxEmployes: number; points: string[] }> = {
  solo: {
    nom: "Solo",
    prix: 19,
    maxEmployes: 8,
    points: ["Jusqu'à 8 salariés", "Planning généré en un clic", "Lien personnel pour chaque employé", "Absences et remplacements"],
  },
  equipe: {
    nom: "Équipe",
    prix: 39,
    maxEmployes: 20,
    points: ["Jusqu'à 20 salariés", "Tout ce qu'il y a dans Solo", "Bientôt : export des heures pour la paie", "Plusieurs plannings types"],
  },
};

export const JOURS_OFFERTS = 30;

/** Limite d'employés actifs. Sans abonnement (essai) ou en bêta, jusqu'à 20 personnes. */
export function maxEmployes(abonnement: Abonnement) {
  return abonnement === "solo" ? OFFRES.solo.maxEmployes : OFFRES.equipe.maxEmployes;
}

/** Publier et partager avec l'équipe demande un abonnement en cours (période offerte et bêta comprises). */
export function abonnementActif(abonnement: Abonnement) {
  return abonnement === "solo" || abonnement === "equipe" || abonnement === "beta";
}

/** Nombre de salariés → tranche du formulaire de démo. */
export function tranche(nbEmployes: number) {
  if (nbEmployes <= 5) return "1 à 5";
  if (nbEmployes <= 10) return "6 à 10";
  if (nbEmployes <= 15) return "11 à 15";
  return "Plus de 15";
}

/** Quelle offre correspond à ce prix Stripe ? */
export function offrePourPrix(priceId: string | null | undefined, prix: { solo?: string; equipe?: string }): Offre | null {
  if (!priceId) return null;
  if (priceId === prix.solo) return "solo";
  if (priceId === prix.equipe) return "equipe";
  return null;
}

/**
 * Statut d'un abonnement Stripe → valeur de restaurants.abonnement.
 * Période d'essai, paiement à jour, ou paiement en retard (Stripe relance) : le compte reste actif.
 */
export function abonnementDepuisStripe(statut: string, offre: Offre | null): Abonnement {
  if (!offre) return "inactif";
  return ["trialing", "active", "past_due"].includes(statut) ? offre : "inactif";
}
