"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPatron, getRestaurant } from "@/lib/session";
import { reglesCompletes } from "@/lib/besoins";
import { creneauxJournee, remplacantsPossibles, type BesoinJour, type ChoixJournee, type Creneau } from "@/lib/planning";
import type { Employe, Poste, ServiceKey } from "@/lib/types";

export type EtatDemande = { erreur?: string };

/** Valide une absence. Avec remplacantId : le remplaçant prend le service. Sans : le service est juste retiré. */
export async function validerDemande(demandeId: string, remplacantId: string | null): Promise<EtatDemande> {
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");
  const regles = reglesCompletes(restaurant.regles);

  // La RLS garantit que la demande appartient à une semaine du patron
  const { data: demande } = await supabase
    .from("demandes")
    .select("id, statut, employe_id, jour, service, poste, semaine:semaine_id(id, date_lundi)")
    .eq("id", demandeId)
    .maybeSingle();
  const semaine = demande?.semaine as unknown as { id: string; date_lundi: string } | null;
  if (!demande || !semaine || demande.jour === null || !demande.service || !demande.poste) return { erreur: "Demande introuvable." };
  if (demande.statut !== "en_attente") return { erreur: "Cette demande a déjà été traitée." };
  const cible = { jour: demande.jour as number, service: demande.service as ServiceKey, poste: demande.poste as Poste };

  const [{ data: lignes }, { data: employes }, { data: besoins }] = await Promise.all([
    supabase.from("creneaux").select("employe_id, jour, service, poste, debut, fin").eq("semaine_id", semaine.id),
    supabase.from("employes").select("*").eq("restaurant_id", restaurant.id),
    supabase.from("besoins").select("jour, service, cuisine, salle, plonge, ouvert").eq("restaurant_id", restaurant.id),
  ]);
  const creneaux = (lignes ?? []).map((c) => ({ ...c, debut: c.debut.slice(0, 5), fin: c.fin.slice(0, 5) })) as Creneau[];

  /** Réécrit la journée d'un employé (supprime puis recrée, pause recalculée). */
  async function reecrireJournee(employeId: string, choix: ChoixJournee) {
    const { error: e1 } = await supabase.from("creneaux").delete()
      .eq("semaine_id", semaine!.id).eq("employe_id", employeId).eq("jour", cible.jour);
    const nouveaux = creneauxJournee(employeId, cible.jour, choix, restaurant!.services, regles.pauseMinutes);
    const { error: e2 } = nouveaux.length
      ? await supabase.from("creneaux").insert(nouveaux.map((c) => ({ ...c, semaine_id: semaine!.id })))
      : { error: null };
    return e1 || e2;
  }
  const journeeDe = (id: string): ChoixJournee =>
    creneaux.filter((c) => c.employe_id === id && c.jour === cible.jour).map((c) => ({ service: c.service, poste: c.poste }));

  if (remplacantId) {
    const possibles = remplacantsPossibles(cible, demande.employe_id, creneaux, (employes ?? []) as Employe[], (besoins ?? []) as BesoinJour[], regles, restaurant.services);
    if (!possibles.some((r) => r.employe.id === remplacantId)) return { erreur: "Cette personne ne peut pas prendre ce service." };
  }

  // 1) L'absent perd ce service  2) le remplaçant le prend  3) la demande est acceptée
  const err1 = await reecrireJournee(demande.employe_id, journeeDe(demande.employe_id).filter((c) => c.service !== cible.service));
  const err2 = remplacantId
    ? await reecrireJournee(remplacantId, [...journeeDe(remplacantId), { service: cible.service, poste: cible.poste }])
    : null;
  const { error: err3 } = await supabase.from("demandes")
    .update({ statut: "acceptee", remplacant_id: remplacantId }).eq("id", demande.id);
  if (err1 || err2 || err3) {
    console.error("validerDemande:", err1?.message, err2?.message, err3?.message);
    return { erreur: "La validation n'a pas pu être enregistrée. Vérifie le planning de la semaine." };
  }

  revalidatePath("/app", "layout");
  return {};
}

/** Refuse une absence : l'employé reste au planning (il le voit sur son lien). */
export async function refuserDemande(demandeId: string): Promise<EtatDemande> {
  const { supabase } = await getPatron();
  const { error } = await supabase.from("demandes").update({ statut: "refusee" }).eq("id", demandeId).eq("statut", "en_attente");
  if (error) return { erreur: "Impossible de refuser la demande. Réessaie." };
  revalidatePath("/app", "layout");
  return {};
}
