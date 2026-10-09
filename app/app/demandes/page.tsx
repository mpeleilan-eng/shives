import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { reglesCompletes } from "@/lib/besoins";
import { ajouterJours, aujourdhuiParis, numeroDuJour } from "@/lib/dates";
import { formatHeures } from "@/lib/employe";
import { lienEmploye } from "@/lib/partage";
import { remplacantsPossibles, type BesoinJour, type Creneau } from "@/lib/planning";
import { JOURS, NOM_POSTE, NOM_SERVICE, type Employe, type Poste, type ServiceKey } from "@/lib/types";
import { BoutonWhatsApp } from "@/components/Partage";
import { PastillePoste } from "@/components/Poste";
import { ChoixRemplacant } from "./ChoixRemplacant";

export const metadata: Metadata = { title: "Demandes · Shives" };

type LigneDemande = {
  id: string;
  statut: "en_attente" | "acceptee" | "refusee";
  message: string;
  created_at: string;
  employe_id: string;
  remplacant_id: string | null;
  jour: number;
  service: ServiceKey;
  poste: Poste;
  semaine: { id: string; date_lundi: string };
};

export default async function PageDemandes() {
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");
  const regles = reglesCompletes(restaurant.regles);

  const ilYa15Jours = ajouterJours(aujourdhuiParis(), -15);
  const [{ data: brutes }, { data: tousEmployes }, { data: besoins }] = await Promise.all([
    supabase.from("demandes")
      .select("id, statut, message, created_at, employe_id, remplacant_id, jour, service, poste, semaine:semaine_id!inner(id, date_lundi, restaurant_id)")
      .eq("semaine.restaurant_id", restaurant.id)
      .or(`statut.eq.en_attente,created_at.gte.${ilYa15Jours}`)
      .not("jour", "is", null)
      .order("created_at", { ascending: false }),
    supabase.from("employes").select("*").eq("restaurant_id", restaurant.id),
    supabase.from("besoins").select("jour, service, cuisine, salle, plonge, ouvert").eq("restaurant_id", restaurant.id),
  ]);
  const demandes = (brutes ?? []) as unknown as LigneDemande[];
  const employes = (tousEmployes ?? []) as Employe[];
  const nom = (id: string | null) => employes.find((e) => e.id === id)?.nom ?? "?";
  const enAttente = demandes.filter((d) => d.statut === "en_attente");
  const traitees = demandes.filter((d) => d.statut !== "en_attente");

  // Créneaux des semaines concernées (pour calculer les remplaçants)
  const semainesIds = [...new Set(enAttente.map((d) => d.semaine.id))];
  const { data: lignes } = semainesIds.length
    ? await supabase.from("creneaux").select("semaine_id, employe_id, jour, service, poste, debut, fin").in("semaine_id", semainesIds)
    : { data: [] };
  const creneauxDe = (semaineId: string) =>
    (lignes ?? []).filter((c) => c.semaine_id === semaineId)
      .map((c) => ({ employe_id: c.employe_id, jour: c.jour, service: c.service, poste: c.poste, debut: c.debut.slice(0, 5), fin: c.fin.slice(0, 5) }) as Creneau);

  const quand = (d: LigneDemande) =>
    `${JOURS[d.jour].toLowerCase()} ${numeroDuJour(d.semaine.date_lundi, d.jour)} ${NOM_SERVICE[d.service].toLowerCase()}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Demandes</h1>
        <p className="m-0 text-muted">Quand quelqu&apos;un ne peut pas venir, il te prévient depuis son lien. Choisis un remplaçant en un clic.</p>
      </div>

      {enAttente.length === 0 ? (
        <p className="m-0 rounded-[18px] border-2 border-dashed border-line px-5 py-8 text-center text-muted">Aucune demande en attente 👌</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {enAttente.map((d) => {
            const passe = ajouterJours(d.semaine.date_lundi, d.jour) < aujourdhuiParis();
            const remplacants = remplacantsPossibles(
              { jour: d.jour, service: d.service, poste: d.poste }, d.employe_id,
              creneauxDe(d.semaine.id), employes, (besoins ?? []) as BesoinJour[], regles, restaurant.services,
            );
            return (
              <li key={d.id} className="flex flex-col gap-3 rounded-[22px] border-2 border-bad/40 bg-surface p-4 sm:p-5">
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold">
                    {nom(d.employe_id)} ne peut pas venir {quand(d)}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <PastillePoste poste={d.poste} />
                    <Link href={`/app/planning/${d.semaine.date_lundi}`} className="font-semibold text-blue no-underline hover:underline">Voir la semaine</Link>
                    {passe && <span className="font-semibold text-bad">Service déjà passé</span>}
                  </span>
                  {d.message && <p className="m-0 mt-1 rounded-xl bg-bg px-3 py-2 italic">« {d.message} »</p>}
                </div>
                <ChoixRemplacant
                  demandeId={d.id}
                  remplacants={remplacants.map((r) => ({
                    id: r.employe.id,
                    nom: r.employe.nom,
                    poste: r.employe.poste,
                    restant: r.minutesRestantes > 0 ? `${formatHeures(r.minutesRestantes / 60)} restantes au contrat` : "Contrat déjà rempli",
                    problemes: r.problemes,
                  }))}
                />
              </li>
            );
          })}
        </ul>
      )}

      {traitees.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">Ces 15 derniers jours</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {traitees.map((d) => {
              const absent = employes.find((e) => e.id === d.employe_id);
              const remplacant = employes.find((e) => e.id === d.remplacant_id);
              return (
                <li key={d.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
                  <span>
                    <b>{nom(d.employe_id)}</b> · {quand(d)} ·{" "}
                    {d.statut === "refusee" ? (
                      <span className="font-semibold text-bad">refusée</span>
                    ) : remplacant ? (
                      <span className="font-semibold text-ok">remplacé par {remplacant.nom}</span>
                    ) : (
                      <span className="font-semibold text-ok">acceptée, sans remplaçant</span>
                    )}
                  </span>
                  {d.statut === "acceptee" && (
                    <div className="flex flex-wrap gap-2 text-sm">
                      {remplacant && (
                        <BoutonWhatsApp
                          telephone={remplacant.telephone}
                          message={`Bonjour ${remplacant.nom}, tu remplaces ${nom(d.employe_id)} ${quand(d)} (${NOM_POSTE[d.poste].toLowerCase()}). Ton planning : ${lienEmploye(remplacant.token_acces)}`}
                          label={`Prévenir ${remplacant.nom}`}
                        />
                      )}
                      {absent && (
                        <BoutonWhatsApp
                          telephone={absent.telephone}
                          message={`Bonjour ${absent.nom}, c'est noté pour ${quand(d)}${remplacant ? ` : ${remplacant.nom} te remplace` : ""}. Ton planning : ${lienEmploye(absent.token_acces)}`}
                          label={`Prévenir ${absent.nom}`}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
