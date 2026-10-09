"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPatron, getRestaurant } from "@/lib/session";
import { estLundi } from "@/lib/dates";
import { reglesCompletes } from "@/lib/besoins";
import { genererCreneaux, type BesoinJour } from "@/lib/planning";
import type { Employe } from "@/lib/types";

export type EtatGeneration = { erreur?: string };

/**
 * « Générer la semaine » (autreProposition = false) ou « Autre proposition » (seed + 1).
 * Remplace tous les créneaux de la semaine par ceux du moteur.
 */
export async function genererSemaine(dateLundi: string, autreProposition: boolean): Promise<EtatGeneration> {
  if (!estLundi(dateLundi)) return { erreur: "Semaine invalide." };
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  const [{ data: besoins }, { data: employes }, { data: existante }] = await Promise.all([
    supabase.from("besoins").select("jour, service, cuisine, salle, plonge, ouvert").eq("restaurant_id", restaurant.id),
    supabase.from("employes").select("*").eq("restaurant_id", restaurant.id).eq("actif", true).order("created_at"),
    supabase.from("semaines").select("id, seed").eq("restaurant_id", restaurant.id).eq("date_lundi", dateLundi).maybeSingle(),
  ]);
  if (!employes?.length) return { erreur: "Ajoute d'abord ton équipe dans l'onglet Équipe." };
  if (!besoins?.some((b) => b.ouvert && b.cuisine + b.salle + b.plonge > 0)) {
    return { erreur: "Indique d'abord tes besoins dans l'onglet Besoins." };
  }

  const seed = existante ? (autreProposition ? existante.seed + 1 : existante.seed) : 1;
  const creneaux = genererCreneaux(restaurant.services, besoins as BesoinJour[], employes as Employe[], reglesCompletes(restaurant.regles), seed);

  // Semaine : on la crée ou on met à jour sa proposition (seed)
  const { data: semaine, error: errSemaine } = await supabase
    .from("semaines")
    .upsert({ restaurant_id: restaurant.id, date_lundi: dateLundi, seed }, { onConflict: "restaurant_id,date_lundi" })
    .select("id")
    .single();
  if (errSemaine || !semaine) {
    console.error("semaines upsert:", errSemaine?.message);
    return { erreur: "Génération impossible. Réessaie." };
  }

  // On remplace les créneaux de la semaine
  const { error: errSuppr } = await supabase.from("creneaux").delete().eq("semaine_id", semaine.id);
  const { error: errAjout } = creneaux.length
    ? await supabase.from("creneaux").insert(creneaux.map((c) => ({ ...c, semaine_id: semaine.id })))
    : { error: null };
  if (errSuppr || errAjout) {
    console.error("creneaux:", errSuppr?.message, errAjout?.message);
    return { erreur: "Le planning n'a pas pu être enregistré. Réessaie." };
  }

  revalidatePath(`/app/planning/${dateLundi}`);
  return {};
}
