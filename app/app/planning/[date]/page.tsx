import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { ajouterJours, estLundi, lundiProchain, titreSemaine } from "@/lib/dates";
import { reglesCompletes } from "@/lib/besoins";
import { calculerEtat, type BesoinJour, type Creneau } from "@/lib/planning";
import { lienEmploye } from "@/lib/partage";
import type { Employe } from "@/lib/types";
import { EditeurPlanning } from "@/components/planning/EditeurPlanning";
import { PartageEquipe } from "@/components/Partage";
import { BoutonsGeneration } from "../BoutonsGeneration";
import { BoutonPublier } from "../BoutonPublier";
import { CopierDepuis, DupliquerVers } from "../CopierSemaine";
import { abonnementActif } from "@/lib/abonnement";
import { styleBouton } from "@/components/ui";

export const metadata: Metadata = { title: "Planning · Shives" };

export default async function PageSemaine({ params }: PageProps<"/app/planning/[date]">) {
  const { date } = await params;
  if (!estLundi(date)) notFound();

  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  const [{ data: semaine }, { data: autresSemaines }, { data: besoins }, { data: tousEmployes }] = await Promise.all([
    supabase.from("semaines").select("id, seed, statut").eq("restaurant_id", restaurant.id).eq("date_lundi", date).maybeSingle(),
    supabase.from("semaines").select("date_lundi").eq("restaurant_id", restaurant.id).neq("date_lundi", date).order("date_lundi", { ascending: false }).limit(12),
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
  const publiee = semaine?.statut === "publiee";
  const nbManques = semaine
    ? calculerEtat(creneaux, (besoins ?? []) as BesoinJour[], employes, regles).alertes.filter((a) => a.niveau === "manque").length
    : 0;
  const semainesExistantes = (autresSemaines ?? []).map((s) => s.date_lundi as string);
  const suivante = ajouterJours(date, 7);
  const lignesEnvoi = employes
    .filter((e) => e.actif)
    .map((e) => ({ id: e.id, nom: e.nom, telephone: e.telephone, lien: lienEmploye(e.token_acces) }));

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
          <CopierDepuis cible={date} semaines={semainesExistantes} />
        </div>
      ) : (
        <>
          {/* Publication */}
          <div className={`flex flex-col gap-3 rounded-[18px] p-4 ${publiee ? "bg-ok-bg" : "border border-line bg-surface"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className={`font-bold ${publiee ? "text-ok" : ""}`}>{publiee ? "✓ Publiée" : "Brouillon"}</span>
                <p className="m-0 text-sm text-muted">
                  {publiee
                    ? "L'équipe voit cette semaine sur son lien. Tes modifications apparaissent tout de suite."
                    : "Seul toi vois ce planning. Publie-le quand il te convient."}
                </p>
              </div>
              {publiee || abonnementActif(restaurant.abonnement) ? (
                <BoutonPublier dateLundi={date} publiee={publiee} nbManques={nbManques} />
              ) : (
                <Link href="/app/abonnement" className={styleBouton.primaire}>Publier : 1er mois offert</Link>
              )}
            </div>
            {publiee && (
              <details className="rounded-xl bg-surface px-4 py-3">
                <summary className="cursor-pointer font-bold">Prévenir l&apos;équipe ({lignesEnvoi.length})</summary>
                <p className="mb-3 mt-1 text-sm text-muted">Chacun reçoit son lien personnel : il voit son planning sur son téléphone, sans appli ni compte.</p>
                <PartageEquipe restaurant={restaurant.nom} lignes={lignesEnvoi} />
              </details>
            )}
          </div>

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
            <div className="flex flex-wrap gap-2">
              <DupliquerVers source={date} cible={suivante} cibleExiste={semainesExistantes.includes(suivante)} />
              <BoutonsGeneration dateLundi={date} existe />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
