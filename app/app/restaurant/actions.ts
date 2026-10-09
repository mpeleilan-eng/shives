"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPatron, getRestaurant } from "@/lib/session";
import { verifierRestaurant } from "@/lib/restaurant";
import { SERVICES } from "@/lib/types";

export type EtatRestaurant = { erreur?: string; enregistre?: boolean };

/** Crée ou met à jour le restaurant du patron, puis ses jours d'ouverture (table besoins). */
export async function enregistrerRestaurant(_: EtatRestaurant, form: FormData): Promise<EtatRestaurant> {
  const verif = verifierRestaurant(form);
  if (!verif.ok) return { erreur: verif.erreur };
  const { nom, services, ouverture } = verif.infos;

  const { supabase } = await getPatron();
  const existant = await getRestaurant();

  let restaurantId: string;
  if (existant) {
    const { error } = await supabase.from("restaurants").update({ nom, services }).eq("id", existant.id);
    if (error) return { erreur: "Enregistrement impossible. Réessaie." };
    restaurantId = existant.id;
  } else {
    const { data, error } = await supabase.from("restaurants").insert({ nom, services }).select("id").single();
    if (error || !data) {
      console.error("restaurants insert:", error?.message);
      return { erreur: "Création impossible. Réessaie." };
    }
    restaurantId = data.id;
  }

  // Jours d'ouverture : une ligne par jour et par service. On ne touche pas aux effectifs déjà saisis.
  const lignes = ouverture.flatMap((o, jour) =>
    SERVICES.map((service) => ({ restaurant_id: restaurantId, jour, service, ouvert: o[service] })),
  );
  const { error } = await supabase.from("besoins").upsert(lignes, { onConflict: "restaurant_id,jour,service" });
  if (error) {
    console.error("besoins upsert:", error.message);
    return { erreur: "Les jours d'ouverture n'ont pas pu être enregistrés. Réessaie." };
  }

  revalidatePath("/app", "layout");
  if (!existant) redirect("/app?bienvenue=1");
  return { enregistre: true };
}
