"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPatron, getRestaurant } from "@/lib/session";
import { verifierBesoinsEtRegles } from "@/lib/besoins";
import { SERVICES, type Besoin } from "@/lib/types";

export type EtatBesoins = { erreur?: string; enregistre?: number };

/** Enregistre les effectifs par service et les règles. Les jours d'ouverture ne changent pas ici. */
export async function enregistrerBesoins(donnees: unknown): Promise<EtatBesoins> {
  const verif = verifierBesoinsEtRegles(donnees);
  if (!verif.ok) return { erreur: verif.erreur };

  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  // On garde l'ouverture déjà enregistrée (réglée dans « Mon restaurant »)
  const { data: existants } = await supabase.from("besoins").select("jour, service, ouvert").eq("restaurant_id", restaurant.id);
  const ouvert = new Map((existants as Pick<Besoin, "jour" | "service" | "ouvert">[] | null)?.map((b) => [`${b.jour}-${b.service}`, b.ouvert]));

  const lignes = verif.grille.flatMap((jour, j) =>
    SERVICES.map((s) => ({
      restaurant_id: restaurant.id,
      jour: j,
      service: s,
      ...jour[s],
      ouvert: ouvert.get(`${j}-${s}`) ?? true,
    })),
  );

  const [b, r] = await Promise.all([
    supabase.from("besoins").upsert(lignes, { onConflict: "restaurant_id,jour,service" }),
    supabase.from("restaurants").update({ regles: verif.regles }).eq("id", restaurant.id),
  ]);
  if (b.error || r.error) {
    console.error("besoins/regles:", b.error?.message, r.error?.message);
    return { erreur: "Enregistrement impossible. Réessaie." };
  }

  revalidatePath("/app", "layout");
  return { enregistre: Date.now() };
}
