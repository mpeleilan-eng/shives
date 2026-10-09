"use server";

import { redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { JOURS_OFFERTS, type Offre } from "@/lib/abonnement";
import { prixStripe, stripe, stripeConfigure } from "@/lib/stripe";
import { siteUrl } from "@/lib/site-url";

export type EtatAbonnement = { erreur?: string };

/** Ouvre la page de paiement Stripe Checkout pour l'offre choisie (1er mois offert au premier abonnement). */
export async function choisirOffre(offre: Offre): Promise<EtatAbonnement> {
  if (offre !== "solo" && offre !== "equipe") return { erreur: "Offre inconnue." };
  if (!stripeConfigure()) return { erreur: "Le paiement n'est pas encore configuré." };
  const { user } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  const prix = prixStripe()[offre]!;
  const premiereFois = !restaurant.stripe_customer_id;
  let url: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: prix, quantity: 1 }],
      client_reference_id: restaurant.id,
      ...(restaurant.stripe_customer_id ? { customer: restaurant.stripe_customer_id } : { customer_email: user.email }),
      subscription_data: {
        metadata: { restaurant_id: restaurant.id },
        ...(premiereFois ? { trial_period_days: JOURS_OFFERTS } : {}),
      },
      metadata: { restaurant_id: restaurant.id },
      locale: "fr",
      allow_promotion_codes: true,
      success_url: `${siteUrl()}/app/abonnement?retour=ok`,
      cancel_url: `${siteUrl()}/app/abonnement?retour=annule`,
    });
    url = session.url;
  } catch (e) {
    console.error("checkout:", e instanceof Error ? e.message : e);
  }
  if (!url) return { erreur: "Impossible d'ouvrir la page de paiement. Réessaie." };
  redirect(url);
}

/** Espace client Stripe : changer d'offre, de carte, voir les factures, résilier. */
export async function gererAbonnement(): Promise<EtatAbonnement> {
  const restaurant = await getRestaurant();
  if (!restaurant?.stripe_customer_id) return { erreur: "Aucun abonnement à gérer." };
  let url: string | null = null;
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: restaurant.stripe_customer_id,
      locale: "fr",
      return_url: `${siteUrl()}/app/abonnement`,
    });
    url = session.url;
  } catch (e) {
    console.error("portail:", e instanceof Error ? e.message : e);
  }
  if (!url) return { erreur: "Impossible d'ouvrir l'espace client Stripe. Réessaie." };
  redirect(url);
}
