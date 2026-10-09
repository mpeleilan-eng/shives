import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { abonnementDepuisStripe, offrePourPrix } from "@/lib/abonnement";
import { prixStripe, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/stripe/webhook : Stripe nous prévient quand un abonnement commence, change ou s'arrête.
 * On vérifie la signature (seul Stripe peut appeler cette route), puis on met à jour restaurants.abonnement.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ erreur: "Signature manquante" }, { status: 400 });

  let evenement: Stripe.Event;
  try {
    evenement = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (e) {
    console.error("webhook signature:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (evenement.type) {
      case "checkout.session.completed": {
        const session = evenement.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;
        const abonnement = await stripe().subscriptions.retrieve(String(session.subscription));
        await appliquer(abonnement, session.client_reference_id);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await appliquer(evenement.data.object, null);
        break;
    }
  } catch (e) {
    console.error("webhook traitement:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: "Erreur de traitement" }, { status: 500 }); // Stripe réessaiera
  }
  return NextResponse.json({ recu: true });
}

/** Met à jour le restaurant lié à cet abonnement Stripe. */
async function appliquer(abonnement: Stripe.Subscription, restaurantIdSession: string | null) {
  const restaurantId = restaurantIdSession ?? abonnement.metadata?.restaurant_id ?? null;
  const client = typeof abonnement.customer === "string" ? abonnement.customer : abonnement.customer.id;
  const offre = offrePourPrix(abonnement.items.data[0]?.price.id, prixStripe());
  let valeur = abonnementDepuisStripe(abonnement.status, offre);

  // Un ancien abonnement qui s'arrête ne doit pas couper un autre abonnement encore en cours
  if (valeur === "inactif") {
    const autres = await stripe().subscriptions.list({ customer: client, status: "all", limit: 10 });
    for (const a of autres.data) {
      const v = abonnementDepuisStripe(a.status, offrePourPrix(a.items.data[0]?.price.id, prixStripe()));
      if (v !== "inactif") { valeur = v; break; }
    }
  }

  const admin = createAdminClient();
  const requete = admin.from("restaurants").update({ abonnement: valeur, stripe_customer_id: client });
  const { error } = restaurantId
    ? await requete.eq("id", restaurantId)
    : await requete.eq("stripe_customer_id", client);
  if (error) throw new Error(error.message);
}
