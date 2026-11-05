import "server-only";
import Stripe from "stripe";
import type { Offre } from "@/lib/abonnement";

// Client Stripe créé à la demande (la clé n'existe pas pendant la compilation sur Vercel).
let client: Stripe | null = null;
export function stripe() {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error("STRIPE_SECRET_KEY manquante (voir .env.example)");
  client ??= new Stripe(cle);
  return client;
}

export function stripeConfigure() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_SOLO && process.env.STRIPE_PRICE_EQUIPE);
}

/**
 * Paiement en ligne ouvert aux patrons ? Fermé par défaut (phase de lancement / bêta gratuite).
 * Pour l'ouvrir : variable PAIEMENT_OUVERT=oui (avec les clés Stripe « live »).
 */
export function paiementOuvert() {
  return stripeConfigure() && process.env.PAIEMENT_OUVERT === "oui";
}

export function prixStripe(): Record<Offre, string | undefined> {
  return { solo: process.env.STRIPE_PRICE_SOLO, equipe: process.env.STRIPE_PRICE_EQUIPE };
}
