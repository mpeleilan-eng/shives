import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKEN } from "@/lib/partage";
import type { Creneau } from "@/lib/planning";
import type { Employe, Poste, Restaurant, ServiceKey } from "@/lib/types";

/**
 * Accès employé par lien personnel (sans compte).
 * Seul le serveur lit la base ici (clé service_role) ; on ne renvoie QUE ce qui concerne cet employé.
 */
export async function employeParToken(token: string) {
  if (!TOKEN.test(token)) return null;
  const admin = createAdminClient();
  const { data: employe } = await admin
    .from("employes")
    .select("id, restaurant_id, nom, poste, contrat_heures, telephone, indispos, actif")
    .eq("token_acces", token)
    .eq("actif", true)
    .maybeSingle();
  if (!employe) return null;
  const { data: restaurant } = await admin.from("restaurants").select("id, nom, services").eq("id", employe.restaurant_id).single();
  if (!restaurant) return null;
  return {
    admin,
    employe: employe as Omit<Employe, "token_acces" | "created_at">,
    restaurant: restaurant as Pick<Restaurant, "id" | "nom" | "services">,
  };
}

export type AccesEmploye = NonNullable<Awaited<ReturnType<typeof employeParToken>>>;
export type CreneauEmploye = Creneau & { id: string };
export type DemandeEmploye = {
  id: string;
  creneau_id: string | null;
  jour: number | null;
  service: ServiceKey | null;
  poste: Poste | null;
  statut: "en_attente" | "acceptee" | "refusee";
  remplacant: string | null;
};
export type SemaineEmploye = { id: string; date_lundi: string; creneaux: CreneauEmploye[]; demandes: DemandeEmploye[] };

/** Les semaines PUBLIÉES de son restaurant à partir de ce lundi, avec seulement ses créneaux et ses demandes. */
export async function semainesPubliees(acces: AccesEmploye, depuisLundi: string): Promise<SemaineEmploye[]> {
  const { admin, employe, restaurant } = acces;
  const { data: semaines } = await admin
    .from("semaines")
    .select("id, date_lundi")
    .eq("restaurant_id", restaurant.id)
    .eq("statut", "publiee")
    .gte("date_lundi", depuisLundi)
    .order("date_lundi")
    .limit(3);
  if (!semaines?.length) return [];
  const ids = semaines.map((s) => s.id);

  const [{ data: creneaux }, { data: demandes }] = await Promise.all([
    admin.from("creneaux").select("id, semaine_id, employe_id, jour, service, poste, debut, fin").eq("employe_id", employe.id).in("semaine_id", ids),
    admin.from("demandes").select("id, semaine_id, creneau_id, jour, service, poste, statut, remplacant:remplacant_id(nom)")
      .eq("employe_id", employe.id).in("semaine_id", ids).order("created_at"),
  ]);

  return semaines.map((s) => ({
    id: s.id,
    date_lundi: s.date_lundi,
    creneaux: (creneaux ?? [])
      .filter((c) => c.semaine_id === s.id)
      .map((c) => ({
        id: c.id, employe_id: c.employe_id, jour: c.jour, service: c.service, poste: c.poste,
        debut: c.debut.slice(0, 5), fin: c.fin.slice(0, 5),
      }) as CreneauEmploye),
    demandes: (demandes ?? [])
      .filter((d) => d.semaine_id === s.id)
      .map((d) => ({
        id: d.id, creneau_id: d.creneau_id, jour: d.jour, service: d.service, poste: d.poste, statut: d.statut,
        remplacant: (d.remplacant as unknown as { nom: string } | null)?.nom ?? null,
      }) as DemandeEmploye),
  }));
}
