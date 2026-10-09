"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPatron, getRestaurant } from "@/lib/session";
import { estLundi } from "@/lib/dates";
import { abonnementActif, maxEmployes } from "@/lib/abonnement";
import { reglesCompletes } from "@/lib/besoins";
import { creneauxJournee, genererCreneaux, type BesoinJour, type ChoixJournee } from "@/lib/planning";
import { POSTES, SERVICES, type Employe } from "@/lib/types";

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

/**
 * Ajustement à la main : fixe la journée d'un employé (aucun, midi, soir ou les deux services).
 * La RLS vérifie que la semaine et l'employé appartiennent bien au restaurant du patron.
 */
export async function modifierJournee(
  dateLundi: string, employeId: string, jour: number, choix: ChoixJournee,
): Promise<EtatGeneration> {
  const choixValide =
    Array.isArray(choix) && choix.length <= SERVICES.length &&
    choix.every((c) => SERVICES.includes(c?.service) && POSTES.includes(c?.poste)) &&
    new Set(choix.map((c) => c.service)).size === choix.length;
  if (!estLundi(dateLundi) || !Number.isInteger(jour) || jour < 0 || jour > 6 || !choixValide || typeof employeId !== "string") {
    return { erreur: "Modification invalide." };
  }

  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  const { data: semaine } = await supabase
    .from("semaines").select("id").eq("restaurant_id", restaurant.id).eq("date_lundi", dateLundi).maybeSingle();
  if (!semaine) return { erreur: "Génère d'abord la semaine." };

  const nouveaux = creneauxJournee(employeId, jour, choix, restaurant.services, reglesCompletes(restaurant.regles).pauseMinutes);
  const { error: errSuppr } = await supabase.from("creneaux").delete()
    .eq("semaine_id", semaine.id).eq("employe_id", employeId).eq("jour", jour);
  const { error: errAjout } = nouveaux.length
    ? await supabase.from("creneaux").insert(nouveaux.map((c) => ({ ...c, semaine_id: semaine.id })))
    : { error: null };
  if (errSuppr || errAjout) {
    console.error("modifierJournee:", errSuppr?.message, errAjout?.message);
    return { erreur: "La modification n'a pas été enregistrée. Réessaie." };
  }

  revalidatePath(`/app/planning/${dateLundi}`);
  return {};
}

/** Publie la semaine (visible par l'équipe sur leurs liens) ou la repasse en brouillon. */
export async function publierSemaine(dateLundi: string, publier: boolean): Promise<EtatGeneration> {
  if (!estLundi(dateLundi)) return { erreur: "Semaine invalide." };
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");
  if (publier && !abonnementActif(restaurant.abonnement)) {
    return { erreur: "Pour publier, choisis une offre dans Abonnement (le premier mois est offert)." };
  }
  if (publier) {
    const { count } = await supabase.from("employes").select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id).eq("actif", true);
    if ((count ?? 0) > maxEmployes(restaurant.abonnement)) {
      return { erreur: `Ton offre va jusqu'à ${maxEmployes(restaurant.abonnement)} salariés et tu en as ${count}. Passe à l'offre Équipe ou retire quelqu'un de l'équipe.` };
    }
  }

  const { error } = await supabase
    .from("semaines")
    .update({ statut: publier ? "publiee" : "brouillon" })
    .eq("restaurant_id", restaurant.id)
    .eq("date_lundi", dateLundi);
  if (error) {
    console.error("publierSemaine:", error.message);
    return { erreur: "Impossible de changer la publication. Réessaie." };
  }
  revalidatePath(`/app/planning/${dateLundi}`);
  return {};
}

/**
 * Duplique une semaine : copie ses créneaux vers une autre semaine (en brouillon).
 * Les anciens employés (retirés de l'équipe) ne sont pas recopiés.
 */
export async function dupliquerSemaine(source: string, cible: string): Promise<EtatGeneration & { cible?: string }> {
  if (!estLundi(source) || !estLundi(cible) || source === cible) return { erreur: "Semaines invalides." };
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  const { data: semaines } = await supabase
    .from("semaines").select("id, date_lundi, seed").eq("restaurant_id", restaurant.id).in("date_lundi", [source, cible]);
  const origine = semaines?.find((s) => s.date_lundi === source);
  if (!origine) return { erreur: "La semaine à copier n'existe pas." };

  const [{ data: lignes }, { data: actifs }] = await Promise.all([
    supabase.from("creneaux").select("employe_id, jour, service, poste, debut, fin").eq("semaine_id", origine.id),
    supabase.from("employes").select("id").eq("restaurant_id", restaurant.id).eq("actif", true),
  ]);
  const idsActifs = new Set((actifs ?? []).map((e) => e.id));
  const copies = (lignes ?? []).filter((c) => idsActifs.has(c.employe_id));

  const { data: dest, error: errSemaine } = await supabase
    .from("semaines")
    .upsert({ restaurant_id: restaurant.id, date_lundi: cible, seed: origine.seed, statut: "brouillon" }, { onConflict: "restaurant_id,date_lundi" })
    .select("id").single();
  if (errSemaine || !dest) return { erreur: "Copie impossible. Réessaie." };

  const { error: errSuppr } = await supabase.from("creneaux").delete().eq("semaine_id", dest.id);
  const { error: errAjout } = copies.length
    ? await supabase.from("creneaux").insert(copies.map((c) => ({ ...c, semaine_id: dest.id })))
    : { error: null };
  if (errSuppr || errAjout) {
    console.error("dupliquerSemaine:", errSuppr?.message, errAjout?.message);
    return { erreur: "Copie impossible. Réessaie." };
  }

  revalidatePath(`/app/planning/${cible}`);
  revalidatePath("/app/historique");
  return { cible };
}
