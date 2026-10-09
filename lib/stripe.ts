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

export function prixStripe(): Record<Offre, string | undefined> {
  return { solo: process.env.STRIPE_PRICE_SOLO, equipe: process.env.STRIPE_PRICE_EQUIPE };
}
