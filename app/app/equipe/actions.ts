"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPatron, getRestaurant } from "@/lib/session";
import { verifierEmploye } from "@/lib/employe";
import { createAdminClient } from "@/lib/supabase/admin";

export type EtatEmploye = { erreur?: string };

async function restaurantOuAccueil() {
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");
  return restaurant;
}

/** Ajoute (id absent) ou modifie (id présent) un employé. La RLS garantit qu'il appartient au restaurant du patron. */
export async function enregistrerEmploye(id: string | null, _: EtatEmploye, form: FormData): Promise<EtatEmploye> {
  const verif = verifierEmploye(form);
  if (!verif.ok) return { erreur: verif.erreur };

  const { supabase } = await getPatron();
  const restaurant = await restaurantOuAccueil();

  const { error } = id
    ? await supabase.from("employes").update(verif.infos).eq("id", id).eq("restaurant_id", restaurant.id)
    : await supabase.from("employes").insert({ ...verif.infos, restaurant_id: restaurant.id });
  if (error) {
    console.error("employes:", error.message);
    return { erreur: "Enregistrement impossible. Réessaie." };
  }

  revalidatePath("/app/equipe");
  redirect(`/app/equipe?ok=${encodeURIComponent(verif.infos.nom)}`);
}

/** Retire (actif = false) ou réactive un employé. On ne supprime jamais : l'historique des plannings reste intact. */
export async function changerActif(id: string, actif: boolean) {
  const { supabase } = await getPatron();
  const restaurant = await restaurantOuAccueil();
  const { error } = await supabase.from("employes").update({ actif }).eq("id", id).eq("restaurant_id", restaurant.id);
  if (error) console.error("employes actif:", error.message);
  revalidatePath("/app/equipe");
  redirect("/app/equipe");
}

/**
 * Nouveau lien personnel (si l'ancien a été partagé par erreur) : l'ancien lien ne marche plus.
 * token_acces n'est pas modifiable par le patron (droits SQL) : on vérifie d'abord, via la RLS,
 * que l'employé est bien à lui, puis le serveur change le lien avec la clé service_role.
 */
export async function nouveauLien(id: string) {
  const { supabase } = await getPatron();
  const { data: employe } = await supabase.from("employes").select("id").eq("id", id).maybeSingle();
  if (!employe) redirect("/app/equipe");

  const { error } = await createAdminClient()
    .from("employes")
    .update({ token_acces: crypto.randomUUID() })
    .eq("id", employe.id);
  if (error) console.error("nouveauLien:", error.message);
  revalidatePath(`/app/equipe/${id}`);
  redirect(`/app/equipe/${id}?lien=nouveau`);
}
