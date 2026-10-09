import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKEN } from "@/lib/partage";
import type { Creneau } from "@/lib/planning";
import type { Employe, Restaurant } from "@/lib/types";

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

export type SemaineEmploye = { id: string; date_lundi: string; creneaux: Creneau[] };

/** Les semaines PUBLIÉES de son restaurant à partir de ce lundi, avec seulement ses créneaux à lui. */
export async function semainesPubliees(acces: NonNullable<Awaited<ReturnType<typeof employeParToken>>>, depuisLundi: string) {
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

  const { data: creneaux } = await admin
    .from("creneaux")
    .select("semaine_id, employe_id, jour, service, poste, debut, fin")
    .eq("employe_id", employe.id)
    .in("semaine_id", semaines.map((s) => s.id));

  return semaines.map((s): SemaineEmploye => ({
    id: s.id,
    date_lundi: s.date_lundi,
    creneaux: (creneaux ?? [])
      .filter((c) => c.semaine_id === s.id)
      .map((c) => ({
        employe_id: c.employe_id, jour: c.jour, service: c.service, poste: c.poste,
        debut: c.debut.slice(0, 5), fin: c.fin.slice(0, 5),
      }) as Creneau),
  }));
}
