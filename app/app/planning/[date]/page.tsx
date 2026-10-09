import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { ajouterJours, estLundi, lundiProchain, titreSemaine } from "@/lib/dates";
import { reglesCompletes } from "@/lib/besoins";
import type { BesoinJour, Creneau } from "@/lib/planning";
import type { Employe } from "@/lib/types";
import { EditeurPlanning } from "@/components/planning/EditeurPlanning";
import { BoutonsGeneration } from "../BoutonsGeneration";

export const metadata: Metadata = { title: "Planning · Shives" };

export default async function PageSemaine({ params }: PageProps<"/app/planning/[date]">) {
  const { date } = await params;
  if (!estLundi(date)) notFound();

  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  const [{ data: semaine }, { data: besoins }, { data: tousEmployes }] = await Promise.all([
    supabase.from("semaines").select("id, seed, statut").eq("restaurant_id", restaurant.id).eq("date_lundi", date).maybeSingle(),
    supabase.from("besoins").select("jour, service, cuisine, salle, plonge, ouvert").eq("restaurant_id", restaurant.id),
    supabase.from("employes").select("*").eq("restaurant_id", restaurant.id).order("created_at"),
  ]);

  let creneaux: Creneau[] = [];
  if (semaine) {
    const { data } = await supabase.from("creneaux").select("employe_id, jour, service, poste, debut, fin").eq("semaine_id", semaine.id);
    creneaux = (data ?? []).map((c) => ({ ...c, debut: c.debut.slice(0, 5), fin: c.fin.slice(0, 5) })) as Creneau[];
  }

  // Équipe actuelle + anciens employés encore présents dans ce planning
  const employes = ((tousEmployes ?? []) as Employe[]).filter((e) => e.actif || creneaux.some((c) => c.employe_id === e.id));
  const regles = reglesCompletes(restaurant.regles);
  const prochaine = lundiProchain();

  return (
    <div className="flex flex-col gap-5">
      {/* Navigation entre semaines */}
      <div className="flex items-center justify-between gap-2">
        <Link href={`/app/planning/${ajouterJours(date, -7)}`} className="rounded-full px-3 py-2 text-sm font-semibold text-muted no-underline hover:bg-surface hover:text-ink" aria-label="Semaine précédente">
          ←<span className="hidden sm:inline"> Précédente</span>
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{titreSemaine(date)}</h1>
          {date !== prochaine && (
            <Link href={`/app/planning/${prochaine}`} className="text-xs font-semibold text-blue no-underline hover:underline">
              Aller à la semaine prochaine
            </Link>
          )}
        </div>
        <Link href={`/app/planning/${ajouterJours(date, 7)}`} className="rounded-full px-3 py-2 text-sm font-semibold text-muted no-underline hover:bg-surface hover:text-ink" aria-label="Semaine suivante">
          <span className="hidden sm:inline">Suivante </span>→
        </Link>
      </div>

      {!semaine ? (
        <div className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-dashed border-line px-5 py-10 text-center">
          <p className="m-0 text-lg font-bold">Pas encore de planning pour cette semaine</p>
          <p className="m-0 max-w-md text-muted">
            Shives répartit ton équipe selon les besoins de chaque service, les contrats, les repos et les indisponibilités.
          </p>
          <BoutonsGeneration dateLundi={date} existe={false} />
        </div>
      ) : (
        <>
          <EditeurPlanning
            // une nouvelle proposition remet l'éditeur à zéro
            key={semaine.seed}
            dateLundi={date}
            employes={employes}
            creneauxInitiaux={creneaux}
            besoins={(besoins ?? []) as BesoinJour[]}
            regles={regles}
            services={restaurant.services}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-xs text-muted">Proposition n° {semaine.seed}</span>
            <BoutonsGeneration dateLundi={date} existe />
          </div>
        </>
      )}
    </div>
  );
}
