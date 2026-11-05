"use server";

import { redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { after } from "next/server";
import { JOURS_OFFERTS, tranche, type Offre } from "@/lib/abonnement";
import { paiementOuvert, prixStripe, stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { alerterNouvelleDemande } from "@/lib/alerte";
import { TAILLES, type DemandeDemo } from "@/lib/demo";

export type EtatAbonnement = { erreur?: string; demandeEnvoyee?: boolean };

/**
 * Phase de lancement : le patron demande l'accès gratuit « resto fondateur ».
 * La demande est enregistrée (demandes_demo) et le créateur de Shives reçoit un e-mail ;
 * il active ensuite le resto avec « npm run beta ».
 */
export async function demanderAcces(): Promise<EtatAbonnement> {
  const { user, supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");
  if (!user.email) return { erreur: "Adresse e-mail introuvable." };

  const { count } = await supabase.from("employes").select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id).eq("actif", true);
  const taille = tranche(count ?? 0) as (typeof TAILLES)[number];
  const demande: DemandeDemo = {
    prenom: user.email.split("@")[0].slice(0, 60),
    restaurant: restaurant.nom.slice(0, 100),
    ville: "",
    taille,
    contact: user.email.slice(0, 120),
  };

  const admin = createAdminClient();
  // Pas de doublon : une demande par adresse e-mail suffit
  const { data: deja } = await admin.from("demandes_demo").select("id").eq("contact", demande.contact).limit(1);
  if (!deja?.length) {
    const { error } = await admin.from("demandes_demo").insert(demande);
    if (error) {
      console.error("demanderAcces:", error.message);
      return { erreur: "La demande n'a pas pu être envoyée. Réessaie." };
    }
    after(() => alerterNouvelleDemande(demande, "accès bêta"));
  }
  return { demandeEnvoyee: true };
}

/** Ouvre la page de paiement Stripe Checkout pour l'offre choisie (1er mois offert au premier abonnement). */
export async function choisirOffre(offre: Offre): Promise<EtatAbonnement> {
  if (offre !== "solo" && offre !== "equipe") return { erreur: "Offre inconnue." };
  if (!paiementOuvert()) return { erreur: "Le paiement en ligne n'est pas encore ouvert : demande ton accès gratuit." };
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
