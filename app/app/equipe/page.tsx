import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { formatHeures } from "@/lib/employe";
import { JOURS_COURTS, type Employe } from "@/lib/types";
import { PastillePoste } from "@/components/Poste";
import { Message, styleBouton } from "@/components/ui";

export const metadata: Metadata = { title: "Équipe · Shives" };

function LigneEmploye({ e }: { e: Employe }) {
  return (
    <li>
      <Link
        href={`/app/equipe/${e.id}`}
        className="flex items-center justify-between gap-3 rounded-[18px] border border-line bg-surface px-4 py-3.5 no-underline hover:border-blue"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-lg font-bold">{e.nom}</span>
          <div className="flex flex-wrap items-center gap-2">
            <PastillePoste poste={e.poste} />
            {e.indispos.length > 0 && (
              <span className="text-xs font-semibold text-muted">Jamais le {e.indispos.map((j) => JOURS_COURTS[j].toLowerCase()).join(", ")}</span>
            )}
          </div>
        </div>
        <span className="shrink-0 font-display text-xl font-bold tabular-nums">{formatHeures(Number(e.contrat_heures))}</span>
      </Link>
    </li>
  );
}

export default async function PageEquipe({ searchParams }: PageProps<"/app/equipe">) {
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");
  const { ok, limite } = await searchParams;

  const { data } = await supabase.from("employes").select("*").eq("restaurant_id", restaurant.id).order("nom");
  const employes = (data ?? []) as Employe[];
  const actifs = employes.filter((e) => e.actif);
  const retires = employes.filter((e) => !e.actif);
  const totalHeures = actifs.reduce((t, e) => t + Number(e.contrat_heures), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Équipe</h1>
          {actifs.length > 0 && (
            <p className="m-0 text-muted">
              {actifs.length} {actifs.length > 1 ? "personnes" : "personne"} · {formatHeures(totalHeures)} au contrat par semaine
            </p>
          )}
        </div>
        <Link href="/app/equipe/nouveau" className={styleBouton.primaire}>+ Ajouter</Link>
      </div>

      {typeof ok === "string" && <Message type="ok">C&apos;est enregistré pour {ok}.</Message>}
      {limite && (
        <Message type="erreur">
          Ton offre est complète. <Link href="/app/abonnement" className="font-bold underline">Passe à l&apos;offre Équipe</Link> pour ajouter du monde.
        </Message>
      )}

      {actifs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] border-2 border-dashed border-line px-5 py-10 text-center">
          <p className="m-0 text-lg font-bold">Ton équipe est vide</p>
          <p className="m-0 text-muted">Ajoute chaque employé une seule fois : son poste et ses heures au contrat.</p>
          <Link href="/app/equipe/nouveau" className={styleBouton.primaire}>Ajouter mon premier employé</Link>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {actifs.map((e) => <LigneEmploye key={e.id} e={e} />)}
        </ul>
      )}

      {retires.length > 0 && (
        <details className="rounded-[18px] border border-line px-4 py-3">
          <summary className="cursor-pointer font-semibold text-muted">Anciens employés ({retires.length})</summary>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 opacity-70">
            {retires.map((e) => <LigneEmploye key={e.id} e={e} />)}
          </ul>
        </details>
      )}
    </div>
  );
}
