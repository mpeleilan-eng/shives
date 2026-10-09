import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { abonnementActif, JOURS_OFFERTS, maxEmployes, OFFRES, type Offre } from "@/lib/abonnement";
import { stripeConfigure } from "@/lib/stripe";
import { Carte, Message } from "@/components/ui";
import { BoutonGerer, BoutonOffre } from "./BoutonsAbonnement";

export const metadata: Metadata = { title: "Abonnement · Shives" };

export default async function PageAbonnement({ searchParams }: PageProps<"/app/abonnement">) {
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");
  const { retour } = await searchParams;

  const { count } = await supabase.from("employes").select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id).eq("actif", true);
  const actif = abonnementActif(restaurant.abonnement);
  const offreActuelle = actif ? (restaurant.abonnement as Offre) : null;
  const dejaClient = Boolean(restaurant.stripe_customer_id);
  const nbEmployes = count ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Abonnement</h1>
        <p className="m-0 text-muted">Un prix fixe, sans engagement. Résiliable à tout moment.</p>
      </div>

      {retour === "ok" && !actif && (
        <Message type="ok">Paiement reçu ! L&apos;activation prend quelques secondes : recharge la page.</Message>
      )}
      {retour === "ok" && actif && <Message type="ok">C&apos;est tout bon : ton abonnement {OFFRES[offreActuelle!].nom} est actif.</Message>}
      {retour === "annule" && <Message type="erreur">Paiement annulé. Tu peux recommencer quand tu veux.</Message>}
      {!stripeConfigure() && <Message type="erreur">Le paiement n&apos;est pas encore configuré (clés Stripe manquantes).</Message>}

      <Carte className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-sm font-semibold text-muted">Ton offre</span>
            <p className="m-0 font-display text-2xl font-extrabold">
              {offreActuelle ? OFFRES[offreActuelle].nom : restaurant.abonnement === "inactif" ? "Abonnement arrêté" : "Pas encore d'abonnement"}
            </p>
            <span className="text-sm text-muted">{nbEmployes} / {maxEmployes(restaurant.abonnement)} salariés actifs</span>
          </div>
          {dejaClient && <BoutonGerer />}
        </div>
        {actif && nbEmployes > maxEmployes(restaurant.abonnement) && (
          <Message type="erreur">
            Tu as {nbEmployes} salariés actifs, ton offre {OFFRES[offreActuelle!].nom} va jusqu&apos;à {maxEmployes(restaurant.abonnement)}.
            Tu ne peux plus publier : passe à l&apos;offre Équipe avec « Gérer mon abonnement », ou retire quelqu&apos;un de l&apos;équipe.
          </Message>
        )}
        {!actif && (
          <p className="m-0 rounded-xl bg-blue-soft px-3.5 py-3 text-sm">
            Tu peux préparer tes plannings librement. Pour <b>publier</b> et envoyer les liens à ton équipe, choisis une offre
            {dejaClient ? "." : ` : le premier mois est offert (${JOURS_OFFERTS} jours), tu ne paies rien avant.`}
          </p>
        )}
      </Carte>

      {!actif && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["solo", "equipe"] as const).map((o) => {
            const trop = nbEmployes > OFFRES[o].maxEmployes;
            return (
              <Carte key={o} className={`flex flex-col gap-3 ${o === "equipe" ? "border-2! border-blue!" : ""}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{OFFRES[o].nom}</h2>
                  {o === "equipe" && <span className="rounded-full bg-blue px-2.5 py-1 text-xs font-bold text-on-blue">Le plus choisi</span>}
                </div>
                <p className="m-0 font-display text-5xl font-extrabold tracking-tight">
                  {OFFRES[o].prix} €<small className="font-sans text-base font-semibold text-muted"> / mois HT</small>
                </p>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {OFFRES[o].points.map((p) => <li key={p} className="flex gap-2"><span className="text-ok">✓</span>{p}</li>)}
                </ul>
                {trop ? (
                  <p className="m-0 text-sm font-semibold text-bad">Tu as {nbEmployes} salariés actifs : cette offre va jusqu&apos;à {OFFRES[o].maxEmployes}.</p>
                ) : (
                  <BoutonOffre offre={o} principal={o === "equipe"} label={dejaClient ? `Choisir ${OFFRES[o].nom}` : "Essayer 1 mois gratuit"} />
                )}
              </Carte>
            );
          })}
        </div>
      )}

      <p className="m-0 text-xs text-muted">Paiement sécurisé par Stripe. Shives ne voit jamais ta carte bancaire.</p>
    </div>
  );
}
